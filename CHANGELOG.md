# [0.12.0](https://github.com/hereya/hereya-cli/compare/0.11.0...0.12.0) (2025-01-18)


### Features

* replace terraform with opentofu to avoid licencing issues ([502f8ed](https://github.com/hereya/hereya-cli/commit/502f8edd8755b9e2ab2eb6b65830376649db0153))



# [0.11.0](https://github.com/hereya/hereya-cli/compare/0.10.0...0.11.0) (2025-01-17)


### Features

* prepare for release ([cd3c658](https://github.com/hereya/hereya-cli/commit/cd3c658d8774910a3d9a86fef809b99118bf491a))



# [0.10.0](https://github.com/hereya/hereya-cli/compare/0.9.2...0.10.0) (2024-07-08)


### Features

* Add new commands for setting and unsetting workspace environment variables ([f163c8a](https://github.com/hereya/hereya-cli/commit/f163c8a36051d662911d766e6e2577e818cc58d2))



## [0.9.2](https://github.com/hereya/hereya-cli/compare/0.9.1...0.9.2) (2024-07-08)


### Bug Fixes

* fix env serialization ([ead46f6](https://github.com/hereya/hereya-cli/commit/ead46f6014ac5877c39eb386d46ac518af3c25ad))



## [0.9.1](https://github.com/hereya/hereya-cli/compare/0.9.0...0.9.1) (2024-07-07)


### Bug Fixes

* Add utility functions for object and base64 manipulations ([bd14172](https://github.com/hereya/hereya-cli/commit/bd14172b699fde442cc20753eedf2543eaa87128))



# [0.9.0](https://github.com/hereya/hereya-cli/compare/0.8.7...0.9.0) (2024-07-07)


### Features

* Add utility functions for object manipulation and base64 conversion ([7dde35b](https://github.com/hereya/hereya-cli/commit/7dde35baa2dbd9b71fa48abce4105b6bd6e6b9ac))



## [0.8.7](https://github.com/hereya/hereya-cli/compare/0.8.6...0.8.7) (2024-07-02)


### Bug Fixes

* Implement Base64 encoding for object values ([1f9ebd9](https://github.com/hereya/hereya-cli/commit/1f9ebd9acea3b57933ecfbaa25526f76c409bfb8))



## [0.8.6](https://github.com/hereya/hereya-cli/compare/0.8.5...0.8.6) (2024-07-02)


### Bug Fixes

* Refactor parameter and environment variables handling ([8f4ae5a](https://github.com/hereya/hereya-cli/commit/8f4ae5ac43c06d399464ffde19959c9ee52f2aa5))



## [0.8.5](https://github.com/hereya/hereya-cli/compare/0.8.4...0.8.5) (2024-07-02)


### Bug Fixes

* Update parameter formatting in AWS script ([4d5ff1e](https://github.com/hereya/hereya-cli/commit/4d5ff1e09ab1ff556251bab002e2fc88ba6280f7))



## [0.8.4](https://github.com/hereya/hereya-cli/compare/0.8.3...0.8.4) (2024-07-02)


### Bug Fixes

* Add mapping for terraform variables in env ([02e957b](https://github.com/hereya/hereya-cli/commit/02e957b2e5c121fdbfda7d3292c96da451324537))



## [0.8.3](https://github.com/hereya/hereya-cli/compare/0.8.2...0.8.3) (2024-06-28)


### Bug Fixes

* Use AWS_DEFAULT_REGION as fallback for AWS_REGION ([b5b3d2c](https://github.com/hereya/hereya-cli/commit/b5b3d2cf4d6206a703e3a82bb2f20f432fb1c37b)), closes [#10](https://github.com/hereya/hereya-cli/issues/10)



## [0.8.2](https://github.com/hereya/hereya-cli/compare/0.8.1...0.8.2) (2024-06-28)


### Bug Fixes

* Add Terraform binary downloading support ([98b48b2](https://github.com/hereya/hereya-cli/commit/98b48b252b76a7edb5d388dac1dc64158351d240))



## [0.8.1](https://github.com/hereya/hereya-cli/compare/0.8.0...0.8.1) (2024-06-11)


### Bug Fixes

* Add space to enhance code readability in aws.ts ([987faab](https://github.com/hereya/hereya-cli/commit/987faab0739bef150c434197b909fed6a9009ba4))



# [0.8.0](https://github.com/hereya/hereya-cli/compare/0.7.0...0.8.0) (2024-06-10)


### Features

* Add dependencies handling and provisioning ID support ([f4c0289](https://github.com/hereya/hereya-cli/commit/f4c02894bb6e214c14d9aff921885d0ad99bb6ac))
* Update tests to consider package dependencies ([572fc29](https://github.com/hereya/hereya-cli/commit/572fc297c4cfc343d5ffaf230482625721261fe8))



# [0.7.0](https://github.com/hereya/hereya-cli/compare/0.6.4...0.7.0) (2024-06-07)


### Features

* Add unbootstrap functionality for AWS and local infrastructure ([53e1cd0](https://github.com/hereya/hereya-cli/commit/53e1cd0f9991d385ea8d5cef0c0413ce82b65aca))



## [0.6.4](https://github.com/hereya/hereya-cli/compare/0.6.3...0.6.4) (2024-06-06)


### Bug Fixes

* Update the Env command to support specific env display and list mode ([08c5fa0](https://github.com/hereya/hereya-cli/commit/08c5fa0879f6ba797bdcd8b493c3dc2f1c6572d6))



## [0.6.3](https://github.com/hereya/hereya-cli/compare/0.6.2...0.6.3) (2024-06-06)


### Bug Fixes

* Add arg and flag handling for WorkspaceEnv command ([fe50bed](https://github.com/hereya/hereya-cli/commit/fe50bedb6e07209eefe65a1e90cacb1cdbd6ba26))



## [0.6.2](https://github.com/hereya/hereya-cli/compare/0.6.1...0.6.2) (2024-06-05)


### Bug Fixes

* Add condition to parameter deletion in AWS ([f5b366e](https://github.com/hereya/hereya-cli/commit/f5b366e507f45e7a48725d48b78107e63c7c8233))



## [0.6.1](https://github.com/hereya/hereya-cli/compare/0.6.0...0.6.1) (2024-06-05)


### Bug Fixes

* Add parameter value check in aws.ts ([d0c7006](https://github.com/hereya/hereya-cli/commit/d0c70060d74b768c606202aa10576d88850c3043))



# [0.6.0](https://github.com/hereya/hereya-cli/compare/0.5.7...0.6.0) (2024-06-05)


### Features

* Add Secrets Manager support to AWS infrastructure ([1ade89b](https://github.com/hereya/hereya-cli/commit/1ade89bb0d620f8d5a0314eab77f789cd739cb5d))



## [0.5.7](https://github.com/hereya/hereya-cli/compare/0.5.6...0.5.7) (2024-06-04)


### Bug Fixes

* Replace JSON string encoding with base64 for project environment variables ([b1b8d31](https://github.com/hereya/hereya-cli/commit/b1b8d31e8ec8845f2497ae66c096b219dd83f5c7))



## [0.5.6](https://github.com/hereya/hereya-cli/compare/0.5.5...0.5.6) (2024-06-04)


### Bug Fixes

* Change script commands from cdk to npx aws-cdk ([9c83eb6](https://github.com/hereya/hereya-cli/commit/9c83eb690d6461d366432507aff7af6f6d67f73c))



## [0.5.5](https://github.com/hereya/hereya-cli/compare/0.5.4...0.5.5) (2024-06-04)


### Bug Fixes

* Update deployment test and replace 'npx' with 'cdk' ([e6fdd66](https://github.com/hereya/hereya-cli/commit/e6fdd6659634caf8a2e983b2a2c79dfcd1d0b941))



## [0.5.4](https://github.com/hereya/hereya-cli/compare/0.5.3...0.5.4) (2024-06-04)


### Bug Fixes

* Add support for Terraform in aws.ts ([a8564cf](https://github.com/hereya/hereya-cli/commit/a8564cffb0cc3e50579e492e6e00a712683c002e))



## [0.5.3](https://github.com/hereya/hereya-cli/compare/0.5.2...0.5.3) (2024-06-04)


### Bug Fixes

* Refactor implementation of serialized contexts in CDK scripts ([ca58a68](https://github.com/hereya/hereya-cli/commit/ca58a689a7a71ec06d012fe0994f0fc186766fcf))



## [0.5.2](https://github.com/hereya/hereya-cli/compare/0.5.1...0.5.2) (2024-06-04)


### Bug Fixes

* Add logging for deployment environments ([337ff01](https://github.com/hereya/hereya-cli/commit/337ff01d9c558d661f652296731cf50458813a3e))



## [0.5.1](https://github.com/hereya/hereya-cli/compare/0.5.0...0.5.1) (2024-06-04)


### Bug Fixes

* Store and delete parameters securely in AWS Parameter Store ([fcaf7f2](https://github.com/hereya/hereya-cli/commit/fcaf7f28f9964c52b8b9acb5ccec229cc12d5160))



# [0.5.0](https://github.com/hereya/hereya-cli/compare/0.4.6...0.5.0) (2024-06-03)


### Features

* Add support for deployment companion packages ([a81c1fa](https://github.com/hereya/hereya-cli/commit/a81c1fa872b8bce7e7ef08e9035ec7988f93e2e0))



## [0.4.6](https://github.com/hereya/hereya-cli/compare/0.4.5...0.4.6) (2024-06-01)


### Bug Fixes

* Enhanced error resilience when parsing environment variables and parameters in remote execution. ([1b2a232](https://github.com/hereya/hereya-cli/commit/1b2a23228e034513dc5fdb26100823cfd519d1e7))



## [0.4.5](https://github.com/hereya/hereya-cli/compare/0.4.4...0.4.5) (2024-06-01)


### Bug Fixes

* Enhanced the SSMClient to retrieve bootstrap configuration for S3 bucket name instead of using a hardcoded value. Additionally, updated project description in package.json and README.md for better clarity. ([cdf7294](https://github.com/hereya/hereya-cli/commit/cdf7294b866d80292a76bfca60b5b21417fba69c))



## [0.4.4](https://github.com/hereya/hereya-cli/compare/0.4.3...0.4.4) (2024-05-31)


### Bug Fixes

* make package removal idempotent ([016377e](https://github.com/hereya/hereya-cli/commit/016377ed88d208e502b28b6afa48a85041350043))



## [0.4.3](https://github.com/hereya/hereya-cli/compare/0.4.2...0.4.3) (2024-05-26)


### Bug Fixes

* Refactor getParameterNames method in cdk.ts ([3f3a3f7](https://github.com/hereya/hereya-cli/commit/3f3a3f74d94d3715347e08af77dbc8ff90e7386d))
* Refactor parameter serialization in 'cdk.ts' ([bfc205f](https://github.com/hereya/hereya-cli/commit/bfc205fc132e3ddc88bfc078ebb1686535e87c3f))



## [0.4.2](https://github.com/hereya/hereya-cli/compare/0.4.1...0.4.2) (2024-05-26)


### Bug Fixes

* Update author details in package.json ([5e68d0d](https://github.com/hereya/hereya-cli/commit/5e68d0de606dc5793513a37b2ef04062591476cc))



## [0.4.1](https://github.com/hereya/hereya-cli/compare/0.4.0...0.4.1) (2024-05-25)


### Bug Fixes

* Refactor environment variable assignment in terraform.ts ([53fd05f](https://github.com/hereya/hereya-cli/commit/53fd05f90a9d113c8250595dfb204e68c986b24d))



# [0.4.0](https://github.com/hereya/hereya-cli/compare/0.3.4...0.4.0) (2024-05-25)


### Features

* Refactor AWS infrastructure and implement undeploy function ([f268b35](https://github.com/hereya/hereya-cli/commit/f268b35f95005a833cc400b720f86d1e2e79e4cf))



## [0.3.4](https://github.com/hereya/hereya-cli/compare/0.3.3...0.3.4) (2024-05-24)


### Bug Fixes

* Bypass main branch protection for release ([694fdf9](https://github.com/hereya/hereya-cli/commit/694fdf9b7385a9f521c194181f52dd1f683c98de))
* Bypass main branch protection for release ([cf6a6b9](https://github.com/hereya/hereya-cli/commit/cf6a6b910e39b2bf620d9677495356fa71043749))



## [0.3.3](https://github.com/hereya/hereya-cli/compare/0.3.2...0.3.3) (2024-05-24)


### Bug Fixes

* Remove env in parameter store after destroy in AWS ([82885e6](https://github.com/hereya/hereya-cli/commit/82885e6855229a1ac672753b2dc9da31975cfe1e))



## [0.3.2](https://github.com/hereya/hereya-cli/compare/0.3.1...0.3.2) (2024-05-24)


### Bug Fixes

* Add check for empty package parameters ([d595b76](https://github.com/hereya/hereya-cli/commit/d595b76014369dedf35025cb83573bde37faa111))



## [0.3.1](https://github.com/hereya/hereya-cli/compare/0.3.0...0.3.1) (2024-05-24)


### Bug Fixes

* Implement resolveEnv method in AWS infrastructure ([f8a23a2](https://github.com/hereya/hereya-cli/commit/f8a23a28254a87cddd201c3d729e8f49645d64b2))



# [0.3.0](https://github.com/hereya/hereya-cli/compare/0.2.1...0.3.0) (2024-05-24)


### Features

* Implement aws infrastructure ([41dd1f7](https://github.com/hereya/hereya-cli/commit/41dd1f7829b2984972d5e6c49891a59a11c81e39))



## [0.2.1](https://github.com/hereya/hereya-cli/compare/0.2.0...0.2.1) (2024-05-23)


### Bug Fixes

* Added yarn.lock with specified package versions ([8f8f9c2](https://github.com/hereya/hereya-cli/commit/8f8f9c252c9eac40dd3fdd16b6df01983987077f))



# [0.2.0](https://github.com/hereya/hereya-cli/compare/15abb1b1dd83346427277523defdedc5f5ab367d...0.2.0) (2024-05-23)


### Features

* switch to yarn for release ([bdf95b7](https://github.com/hereya/hereya-cli/commit/bdf95b787c4250763fe1fdad6748c3b7c2274c7e))
* trigger new release ([15abb1b](https://github.com/hereya/hereya-cli/commit/15abb1b1dd83346427277523defdedc5f5ab367d))



