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

import * as vscode from 'vscode';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { noop } from '@noelware/utils';
import { spawn } from 'child_process';

const uniqueId = () => Math.floor(Math.random() * 1_000_000).toString();

export default class implements vscode.DocumentFormattingEditProvider, vscode.Disposable {
    #tmpdir: vscode.Uri;
    #binary: string;

    constructor(binary: string) {
        this.#tmpdir = vscode.Uri.file(join(tmpdir(), `vscode-buf_${uniqueId()}`));
        this.#binary = binary;
    }

    async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ) {
        // Create our temporary directory
        await vscode.workspace.fs.createDirectory(this.#tmpdir);

        // Since Buf doesn't support reading from stdin, we have to create temporary files
        // for each formatted file we need.
        const backup = join(this.#tmpdir.fsPath, `${uniqueId()}__${basename(document.fileName)}`);
        const encoded = new TextEncoder().encode(document.getText());

        await vscode.workspace.fs.writeFile(vscode.Uri.file(backup), encoded);

        return new Promise<vscode.TextEdit[]>((resolve, reject) => {
            // Now, we need to spawn the process to execute the command.
            const proc = spawn(this.#binary, ['format', backup], { cwd: this.#tmpdir.fsPath });

            // If we received a cancellation request before we should start, kill the process.
            token.onCancellationRequested(() => {
                if (!proc.killed) proc.kill();
            });

            // Set the standard output stream to use UTF-8 encoding
            proc.stdout.setEncoding('utf8');
            const [stdout, stderr] = [[] as any[], [] as any[]];

            proc.stdout.on('data', (data) => stdout.push(data));
            proc.stderr.on('data', (data) => stderr.push(data));
            proc.on('error', (error) => {
                if (error) {
                    return reject(error);
                }
            });

            proc.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`failed to run 'buf format'`));
                }

                const [start, end] = [new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).range.end];
                resolve([new vscode.TextEdit(new vscode.Range(start, end), stdout[0])]);
            });
        });
    }

    dispose() {
        vscode.workspace.fs.delete(this.#tmpdir, { recursive: true }).then(noop);
    }
}
