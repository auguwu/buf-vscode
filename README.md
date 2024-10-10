# 🐻‍❄️🍱 [Buf](https://buf.build) :: VSCode Extension
This is the source code for the **auguwu.buf-vscode** extension avaliable on the Visual Studio Marketplace that allows smooth and better integration for [Buf](https://buf.build) by improving upon the **buf.vscode-buf** extension by fixing viewing Protobuf schemas in the editor and enabling the experimental LSP (if `buf` >=1.43 and `buf.experimentals.lsp` eq `true`).

The extension for Buf hasn't been updated for 8 months as of October 8th, 2024 so I decided to revise it on my own instead since I am starting to use Buf in my work when working with Protocol Buffers.

## Features
- Enables the [experimental LSP] that landed in Buf 1.43
- Adds lint messages to Protobuf files
- Allows formatting via `editor.defaultFormatter` OR the `buf.format` command
- Syntax highlighting to Protobuf files

## License
The **auguwu.buf-vscode** extension is licensed under the [**Apache 2.0** License](/LICENSE) with love and care by **Noel Towa**.

[experimental LSP]: https://github.com/bufbuild/buf/releases/tag/v1.43.0
