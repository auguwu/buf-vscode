/*
 * 🐻‍❄️🍱 buf-vscode: Up-to-date, unofficial Visual Studio Code extension for Buf
 * Copyright 2024 Noel Towa <cutie@floofy.dev>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getFilesystemPath } from '../utils';
import { useCommand } from 'reactive-vscode';
import { spawnSync } from 'child_process';
import * as vscode from 'vscode';

export function createLinter(
    binary: string,
    channel: vscode.OutputChannel
): [ReturnType<(typeof vscode)['languages']['createDiagnosticCollection']>, (document: vscode.TextDocument) => void] {
    const collection = vscode.languages.createDiagnosticCollection('bufbuild');
    const perform = (document: vscode.TextDocument) => {
        if (!document.uri.path.endsWith('.proto')) return;

        const cwd = getFilesystemPath()!;
        const child = spawnSync(
            binary,
            ['lint', `${document.uri.fsPath}#include_package_files=true`, '--error-format=json'],
            { cwd }
        );

        if (child.error !== undefined) {
            if (child.error.message.includes('ENOENT')) {
                vscode.window.showWarningMessage(`Unable to lint with \`buf\`, is it installed? (location=${binary})`);
                return;
            }

            channel.appendLine(`Unable to lint with \`buf\`: ${child.error}`);
            return;
        }
    };

    return [collection, perform];
}

/*
    const warnings = parseLines(lines);
    if (isError(warnings)) {
      console.log(warnings);
      return;
    }
    const warningsForThisDocument = warnings.filter(
      (warning: Warning): Boolean => {
        return warning.path === document.uri.fsPath;
      }
    );
    const diagnostics = warningsForThisDocument.map(
      (error: Warning): vscode.Diagnostic => {
        // VSC lines and columns are 0 indexed, so we need to subtract
        const range = new vscode.Range(
          error.start_line - 1,
          error.start_column - 1,
          error.end_line - 1,
          error.end_column - 1
        );
        return new vscode.Diagnostic(
          range,
          `${error.message} (${error.type})`,
          vscode.DiagnosticSeverity.Warning
        );
      }
    );
    diagnosticCollection.set(document.uri, diagnostics);
  };
*/

export default (binary: string, channel: vscode.OutputChannel) =>
    useCommand('buf-vscode.lint', async (editor: vscode.TextEditor) => {
        const [, lint] = createLinter(binary, channel);
        lint(editor.document);
    });
