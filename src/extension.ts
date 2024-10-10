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

import { defineExtension, useDisposable, useOutputChannel } from 'reactive-vscode';
import { getBinaryLocation, hasLSPSupport } from './utils';
import * as vscode from 'vscode';
import * as lc from 'vscode-languageclient/node';

import lint from './commands/lint';

const { activate, deactivate } = defineExtension(async () => {
    console.log('Hello, world!');

    // If there is no 'buf' binary found, then we'll do nothing
    const binary = await getBinaryLocation();
    if (binary === null) {
        return;
    }

    const channel = useOutputChannel('Buf');
    const config = vscode.workspace.getConfiguration('buf');
    const lspSupport = await hasLSPSupport(binary);

    if (lspSupport.isOk()) {
        if (lspSupport.unwrap() && !!config.get<boolean>('experimentals.lsp.enable')) {
            channel.appendLine('Enabling experimental LSP support...');
            channel.appendLine('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

            const args = ['beta', 'lsp', ...(config.get<string[]>('experimentals.lsp.args') || [])];
            channel.appendLine(`$ ${binary} ${args.join(' ')}`);

            const serverOptions: lc.ServerOptions = {
                command: binary,
                args
            };

            const clientOptions: lc.LanguageClientOptions = {
                documentSelector: [{ scheme: 'file', language: 'proto' }],
                outputChannel: channel,
                synchronize: {
                    fileEvents: vscode.workspace.createFileSystemWatcher('**/*.proto')
                }
            };

            const client = new lc.LanguageClient('Buf Language Server', serverOptions, clientOptions, false);
            await client.start();

            useDisposable(client);
        } else {
            channel.appendLine('LSP is not supported for your Buf installation.');
        }
    } else if (lspSupport.isErr()) {
        console.warn('[buf-vscode]: failed to check if LSP support is enabled:', lspSupport.unwrapErr());
        channel.appendLine(`LSP support is disabled due to error:\n${lspSupport.unwrapErr()}`);
    }

    // Register the `buf-vscode.lint` command
    lint(binary, channel);
});

export { activate, deactivate };
