'use strict';
const {DataTypes} = require('sequelize')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up({context: queryInterface}) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.createTable('Project', {
            id: {
                type: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
        });
        await queryInterface.createTable('Workspace', {
            id: {
                type: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
        });
    },

    async down({context: queryInterface}) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('Project');
        await queryInterface.dropTable('Workspace');
    }
};
