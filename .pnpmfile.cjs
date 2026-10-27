function readPackage(pkg) {
  if (pkg.name === 'better-auth' && pkg.version === '1.7.12') {
    delete pkg.peerDependencies?.vitest;
    delete pkg.peerDependenciesMeta?.vitest;
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
