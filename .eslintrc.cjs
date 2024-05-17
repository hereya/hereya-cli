module.exports = {
    "extends": [
        "oclif",
        "oclif-typescript",
        "prettier"
    ],
    "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix']
    }
}

