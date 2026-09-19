import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ExtractedType {
  name: string;
  type: 'interface' | 'enum';
  content: string;
}

function generateTypes(sourceFiles: string[], outputPath: string) {
  const extractedTypes: ExtractedType[] = [];

  // Initialize the TypeScript Compiler API with your project files
  const program = ts.createProgram(sourceFiles, {});
  const checker = program.getTypeChecker();

  for (const sourceFile of program.getSourceFiles()) {
    // Skip external node_modules declarations
    if (sourceFile.isDeclarationFile) continue;

    ts.forEachChild(sourceFile, (node) => {
      // 1. Extract Enums
      if (ts.isEnumDeclaration(node) && hasExportModifier(node)) {
        const enumName = node.name.text;
        const members: string[] = [];

        node.members.forEach((member) => {
          if (member.initializer && ts.isStringLiteral(member.initializer)) {
            members.push(
              `  ${member.name.getText()} = '${member.initializer.text}'`,
            );
          } else {
            members.push(
              `  ${member.name.getText()} = ${member.initializer?.getText()}`,
            );
          }
        });

        extractedTypes.push({
          name: enumName,
          type: 'enum',
          content: `export enum ${enumName} {\n${members.join(',\n')}\n}`,
        });
      }

      // 2. Extract Classes (Entities and DTOs) -> Convert to Interfaces
      if (ts.isClassDeclaration(node) && hasExportModifier(node) && node.name) {
        const className = node.name.text;
        const properties: string[] = [];

        node.members.forEach((member) => {
          if (ts.isPropertyDeclaration(member)) {
            const propName = member.name.getText();

            // Determine if the property is optional (has ? or a class-validator / Mongo optional setup)
            const isOptional = !!member.questionToken;

            // Infer type from TS annotations, falling back to basic extraction
            let typeStr = 'any';
            if (member.type) {
              typeStr = member.type.getText();
            } else if (member.initializer) {
              // Try to infer type from assignment if explicit annotation is missing
              const type = checker.getTypeAtLocation(member.initializer);
              typeStr = checker.typeToString(type);
            }

            // Cleanup Mongoose/Nest specific types if they cross boundaries cleanly
            if (typeStr === 'Date') typeStr = 'string | Date';
            typeStr = typeStr.replace(/Types\.ObjectId/g, 'string');

            properties.push(
              `  ${propName}${isOptional ? '?' : ''}: ${typeStr};`,
            );
          }
        });

        extractedTypes.push({
          name: className,
          type: 'interface',
          content: `export interface ${className} {\n${properties.join('\n')}\n}`,
        });
      }
    });
  }

  // Build the unified string output
  const outputContent = [
    '/* tslint:disable */',
    '/* eslint-disable */',
    '// Auto-generated frontend types from NestJS backend. Do not modify directly.',
    '',
    ...extractedTypes.map((t) => t.content),
  ].join('\n\n');

  // Ensure output directory exists and write file
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, outputContent, 'utf-8');
  console.log(
    `Successfully generated types for ${extractedTypes.length} symbols at: ${outputPath}`,
  );
}

function hasExportModifier(node): boolean {
  return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export);
}

// --- Execution Configuration ---
async function run() {
  // Pattern matching your backend schemas, entities, dtos, and enums
  const filePatterns = [
    'src/**/*.entity.ts',
    'src/**/*.dto.ts',
    'src/**/*.enum.ts',
    'src/**/schemas/*.schema.ts',
  ];
  const projectRoot = process.cwd() + '/server';
  const allFiles: string[] = [];
  // Run each pattern individually to ensure it resolves correctly
  for (const pattern of filePatterns) {
    const matched = await glob(pattern, {
      absolute: true,
      cwd: projectRoot,
      posix: true, // Forces forward slashes for cross-OS reliability
    });
    allFiles.push(...matched);
  }
  // Remove duplicates just in case patterns overlap
  const uniqueFiles = Array.from(new Set(allFiles));

  const outPath = path.resolve(
    projectRoot,
    '../client/types/frontend-types.ts',
  ); // Adjust target path as needed

  generateTypes(uniqueFiles, outPath);
}

run().catch(console.error);
