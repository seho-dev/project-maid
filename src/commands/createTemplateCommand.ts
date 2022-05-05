import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import { Uri, window } from "vscode";
import { getWorkspace, readChildFolders } from "../helpers";
import { copySync } from "fs-extra";
import { camel, hump, hyphen, underline } from "@poech/camel-hump-under";
import { compile } from "handlebars";
import { readDirDeepSync } from "read-dir-deep";

export const createTemplateCommand = async (uri: Uri) => {
  const selectedPath = uri.fsPath;
  const workspace = await getWorkspace(uri.fsPath);
  if (!workspace) {
    return await window.showErrorMessage("Workspace not found.");
  }
  if (!existsSync(join(workspace.uri.fsPath, ".pm"))) {
    return await window.showErrorMessage(
      `Project Maid configurations does not exist in the current project, please refer to the document and create ' PM 'folder and configure it.`
    );
  }
  if (!existsSync(join(workspace.uri.fsPath, ".pm", "templates"))) {
    return await window.showErrorMessage(`There is not Project Maid template configured for this project. Please refer to the documentation.`);
  }

  const instantiateName = await window.showInputBox({
    value: "",
    placeHolder: "Input name..",
  });
  if (!instantiateName) {
    return;
  }

  const templateNames = readChildFolders(join(workspace.uri.fsPath, ".pm", "templates"));
  const templateName = await window.showQuickPick(["<cancel>", ...templateNames], {
    placeHolder: "use template..",
  });
  if (!templateName || templateName === "<cancel>") {
    return;
  }

  const tempatePath = join(workspace.uri.fsPath, ".pm", "templates", templateName);
  const tempateFolderName = readChildFolders(tempatePath)[0];
  console.log(tempateFolderName);

  if (!tempateFolderName) {
    return;
  }

  const templateInnerVars = {
    yourNameRaw: instantiateName,
    yourName: camel(instantiateName),
    YourName: hump(instantiateName),
    your_name: underline(instantiateName).replace(/^\_|\_+$/gm, ""),
    "your-name": hyphen(instantiateName).replace(/^\-+|\-+$/gm, ""),
  };

  const tempateFolderNameF = compile(`${tempateFolderName}`)(templateInnerVars);
  const createdFolderPath = join(selectedPath, tempateFolderNameF);

  if (existsSync(createdFolderPath)) {
    return await window.showErrorMessage("Folder already exists.");
  }

  await copySync(join(workspace.uri.fsPath, ".pm", "templates", templateName, tempateFolderName), createdFolderPath);
  const createdFiles = await readDirDeepSync(createdFolderPath);
  for (const createdFile of createdFiles) {
    if (!createdFile.endsWith(".tpl")) {
      continue;
    }
    const raw = readFileSync(createdFile).toString();
    const result = compile(raw)(templateInnerVars);
    writeFileSync(createdFile, result);
  }
  for (const createdFile of createdFiles) {
    if (!createdFile.endsWith(".tpl")) {
      continue;
    }
    const filePath = dirname(createdFile);
    const fileName = basename(createdFile);
    renameSync(createdFile, join(filePath, compile(`${fileName}`)(templateInnerVars)).slice(0, -4));
  }
  let createdFolders = createdFiles.map((file) => dirname(file));
  createdFolders = createdFolders.filter((item, index) => createdFolders.indexOf(item) === index);
  for (const createdFolder of createdFolders) {
    const folderPath = dirname(createdFolder);
    const folderName = basename(createdFolder);
    renameSync(createdFolder, join(folderPath, compile(`${folderName}`)(templateInnerVars)));
  }

  window.showInformationMessage("Created successfully.");
};
