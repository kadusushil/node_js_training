/*
 * Defines the configuration for server. You can customize following details
 *    1. Define environment
 *    2. HTTP and HTTPS ports
 *    3. Can be extended to add any new configuration
 */

// we start with empty object
var environments = {};

// add staging environment
environments.staging = {
  'httpPort': 8000,
  'httpsPort': 8001,
  'envMode': 'STAGING'
};

// add production environment
environments.production = {
  'httpPort': 9000,
  'httpsPort': 9001,
  'envMode': 'PRODUCTION'
};

// Let's parse what environment has user selected
var userSelectedEnvironment = typeof(environments[process.env.NODE_ENV])
                              !== 'undefined' ?
                              environments[process.env.NODE_ENV]
                              :
                              environments.staging;

// let's make this environment available to the rest of world.
module.exports = userSelectedEnvironment;
