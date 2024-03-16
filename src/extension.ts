import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "myExtension" is now active!'
  );

  let disposableUnit = vscode.commands.registerCommand(
    'extension.createUnitTestFile',
    async () => {
      await createTestFile('unit');
    }
  );

  let disposableIntegration = vscode.commands.registerCommand(
    'extension.createIntegrationTestFile',
    async () => {
      await createTestFile('integration');
    }
  );

  // Register commands for file tab context menu
  let disposableContextMenuUnit =
    vscode.commands.registerTextEditorCommand(
      'extension.createUnitTestFileContextMenu',
      async (editor) => {
        await createTestFile('unit', editor.document.fileName);
      }
    );

  let disposableContextMenuIntegration =
    vscode.commands.registerTextEditorCommand(
      'extension.createIntegrationTestFileContextMenu',
      async (editor) => {
        await createTestFile('integration', editor.document.fileName);
      }
    );

  context.subscriptions.push(disposableUnit);
  context.subscriptions.push(disposableIntegration);
  context.subscriptions.push(disposableContextMenuUnit);
  context.subscriptions.push(disposableContextMenuIntegration);
}

export function deactivate() {}

async function createTestFile(
  testType: string,
  baseFilePath?: string
) {
  const filePath =
    baseFilePath ||
    (vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.document.fileName
      : '');
  if (!filePath) {
    vscode.window.showErrorMessage('No file is currently opened.');
    return;
  }

  const testFilePath = getTestFilePath(filePath, testType);

  try {
    await createFile(filePath, testFilePath, testType);
    vscode.window.showInformationMessage(
      `Test file created: ${testFilePath}`
    );

    // Open the newly created test file
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(testFilePath)
    );
    await vscode.window.showTextDocument(document);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create test file: ${error}`
    );
  }
}

async function createFile(
  baseFilePath: string,
  testFilePath: string,
  testType: string
) {
  return new Promise<void>((resolve, reject) => {
    const testFileContent = generateTestFileContent(
      path.basename(baseFilePath),
      testType
    );
    const relativeBaseDir = removeTopmostDirectory(
      path.dirname(path.relative(getWorkspaceFolder(), baseFilePath))
    );
    let targetTestDirectory = path.join(
      getWorkspaceFolder(),
      'test',
      relativeBaseDir
    );

    if (testType === 'integration') {
      targetTestDirectory = path.join(
        getWorkspaceFolder(),
        'integration_test',
        relativeBaseDir
      );
    }

    fs.mkdir(targetTestDirectory, { recursive: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        fs.writeFile(testFilePath, testFileContent, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

function generateTestFileContent(
  baseFileName: string,
  testType: string
): string {
  const extension = path.extname(baseFileName);
  const testFileName = `${path.basename(
    baseFileName,
    extension
  )}_test${extension}`;
  return `// ${
    testType === 'unit' ? 'Unit' : 'Integration'
  } Test file for ${baseFileName}`;
}

function getTestFilePath(
  baseFilePath: string,
  testType: string
): string {
  const baseFileName = path.basename(baseFilePath);
  const extension = path.extname(baseFileName);
  const relativeBaseDir = removeTopmostDirectory(
    path.dirname(path.relative(getWorkspaceFolder(), baseFilePath))
  );
  const testFileName = `${path.basename(
    baseFileName,
    extension
  )}_test${extension}`;

  let testDirectory = 'test';
  if (testType === 'integration') {
    testDirectory = 'integration_test';
  }

  return path.join(
    getWorkspaceFolder(),
    testDirectory,
    relativeBaseDir,
    testFileName
  );
}

function getWorkspaceFolder(): string {
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  throw new Error('No workspace folder is open.');
}

function removeTopmostDirectory(directoryPath: string): string {
  const segments = directoryPath.split(path.sep);
  if (segments[0] === 'test') {
    segments.shift(); // Remove the first segment (test directory)
  }
  if (segments.length > 0) {
    segments.shift(); // Remove the first segment (topmost directory)
  }
  return segments.join(path.sep);
}
