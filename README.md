# agc-integration-tests
Integration tests for AGC

These integration tests simulate basic and advanced scenarios that may be encountered in AGC.
The goal of each test scenario is to spawn up a cluster and change its state while clients are simultaneously publishing and consuming channel data to/from various instances within that cluster.

To run the tests, you need to have Node.js and Docker installed - You should be able to run the `docker` command from your user account without sudo.
Then:

1. `git clone` this repo
2. `cd` into the newly created directory
3. Run `npm install`
4. Run `npm test`

Note that if you've built an AGC architecture with some custom instances, you can swap out the default Docker images with your own images in `config.js`.

If you find new failure scenarios that you would like someone to look at and/or resolve, feel free to open a pull request on this repo so that we can start working on a fix.

Please put long/complex test scenarios in a separate file under the `test/` directory.

The goal of this project is to help the Asyngular/SC community share solutions and to build up a comprehensive set of test scenarios to help everyone build more robust systems on top of the AGC architecture.
