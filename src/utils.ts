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

const MINIMAL_LSP_SUPPORTED_VERSION_CONSTRAINT = '>=1.44';

import { triAsync, Result, ok, err } from '@noelware/utils/result';
import { assertIsError } from '@noelware/utils';
import { satisfies } from 'semver';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import which from 'which';

/** Returns the filesystem location path for the first workspace folder. */
export function getFilesystemPath() {
    const folder = vscode.workspace.workspaceFolders?.at(0);
    if (folder === undefined) {
        return null;
    }

    const fsUri = folder.uri;
    if (fsUri.scheme !== 'file') {
        console.warn('[buf-vscode] only `file://` schemes are supported');
        return null;
    }

    return fsUri.fsPath;
}

/** Returns the binary location. */
export async function getBinaryLocation() {
    const path = getFilesystemPath();
    if (path === null) {
        return null;
    }

    const configuration = vscode.workspace.getConfiguration('buf');
    const location = configuration.get<string>('binary');

    if (location === undefined) {
        const result = await triAsync(
            () => which('buf'),
            (error) => {
                assertIsError(error);
                return error;
            }
        );

        if (result.isOk()) {
            return result.unwrap();
        }

        console.error(`[buf-vscode] failed to find \`buf\` binary from $PATH: ${result.unwrapErr()}`);
        return null;
    }

    return location;
}

/**
 * Determines if the Buf binary has experimental LSP support.
 *
 * This will just run `buf --version` and check if it matches the
 * minimum version supported.
 *
 * @param binary Buf binary
 */
export function hasLSPSupport(binary: string): Promise<Result<boolean, Error>> {
    console.debug(`$ ${binary} --version :: detection`);
    return new Promise<boolean>((resolve, reject) =>
        exec(`${binary} --version`, (error, stdout, stderr) => {
            if (error !== null) {
                return reject(error);
            }

            const version = stdout.trim();
            resolve(satisfies(version, MINIMAL_LSP_SUPPORTED_VERSION_CONSTRAINT));
        })
    )
        .then((x) => ok<boolean, Error>(x))
        .catch((error) => {
            try {
                assertIsError(error);
                return err(error);
            } catch {
                return err(new Error(JSON.stringify(error)));
            }
        });
}
