import * as fs from "build-utils/fs";
import {exec} from "build-utils/process";
import * as http from "build-utils/http";
import * as path from "path";
import * as colors from "colors";

export interface AppMetadata {
    name: string;
    url: string;
    exe: string;
}

export const basePath = __dirname;
const zipExe = path.join(basePath, "apps/7z/7z.exe");
let apps: AppMetadata[] = null;

export function message(message) {
    console.log(message);
}

export function error(message) {
    console.log(colors.red(message));
}

export function info(message) {
    console.log(colors.cyan(message));
}

export function unzip(zipFilePath, destDirPath) {
    return exec(zipExe + " e " + zipFilePath + " -y -o" + destDirPath, {
        silent: true,
    });
}

async function loadAppsMetadata() {
    if(!apps) {
        const appsFilePath = path.join(basePath, "apps.json");
        apps = await fs.readJSONFile(appsFilePath);
    }

    return apps;
}

export async function getAppMetadata(name: string) {
    const apps = await loadAppsMetadata();

    for(let app of apps) {
        if(app.name == name) {
            return app;
        }
    }

    throw new Error("App with name \"" + name + "\" was not found");
}
