import { config } from 'dotenv';
import fs from "fs";
import appRoot from "app-root-path";

config();

const database = process.env.NODE_ENV === 'development' ? `${appRoot}/src/database/dummy-db.json` :
    `${appRoot}/dist/database/dummy-db.json`;

export default {
    loadDataFromDB: () => {
        const dataBuffer = fs.readFileSync(database);
        const dataJSON = dataBuffer.toString();
        return JSON.parse(dataJSON);
    },
    saveDataToDatabase: data => {
        const dataJSON = JSON.stringify(data);
        fs.writeFileSync(database, dataJSON);
    },
};
