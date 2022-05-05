import * as vscode from "vscode";
import { createTemplateCommand } from "./commands/createTemplateCommand";
import { compile } from "handlebars";

export function activate(context: vscode.ExtensionContext) {
  let helloWorld = vscode.commands.registerCommand("project-maid.helloWorld", () => {
    vscode.window.showInformationMessage(compile("{{ hello-world }} World from project-maid!")({ "hello-world": "xxx" }));
  });

  let createTemplate = vscode.commands.registerCommand("project-maid.createTemplate", createTemplateCommand);

  context.subscriptions.push(createTemplate);
  context.subscriptions.push(helloWorld);
}

export function deactivate() {}
