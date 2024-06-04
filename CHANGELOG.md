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



