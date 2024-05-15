import { Backend, InitProjectInput, InitProjectOutput } from './common.js';
import { SequelizeStorage, Umzug } from 'umzug';
import { DataTypes, Sequelize } from 'sequelize';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export class LocalBackend implements Backend {
    private readonly sequelize: Sequelize;

    constructor() {
        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(os.homedir(), '.hereya', 'db.sqlite')
        });
    }

    async init(options: InitProjectInput): Promise<InitProjectOutput> {
        await this.syncDb();
        const { Project, Workspace } = this.defineModels();
        const [project] = await Project.findOrCreate({
            where: { name: options.project },
            defaults: { id: randomUUID() }
        },);
        const [workspace] = await Workspace.findOrCreate({
            where: { name: options.workspace },
            defaults: { id: randomUUID() }
        },);
        return {
            project: project.toJSON(),
            workspace: workspace.toJSON(),
        }
    }

    private async syncDb() {
        const umzug = new Umzug({
            migrations: { glob: 'migrations/*.cjs' },
            context: this.sequelize.getQueryInterface(),
            storage: new SequelizeStorage({ sequelize: this.sequelize }),
            logger: {
                info: () => {
                },
                warn: () => {
                },
                error: () => {
                },
                debug: () => {
                },
            }
        })
        const pendingMigrations = await umzug.pending();
        if (pendingMigrations.length > 0) {
            await umzug.up();
        }
    }


    private defineModels() {
        const Project = this.sequelize.define('Project', {
            id: {
                type: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false,
            },

        }, { timestamps: false, freezeTableName: true });
        const Workspace = this.sequelize.define('Workspace', {
            id: {
                type: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false,
            }
        }, {
            timestamps: false, freezeTableName: true
        });

        return { Project, Workspace };
    }
}
