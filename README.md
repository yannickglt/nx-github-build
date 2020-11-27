# Blazing Fast Distributed CI with Nx Workspaces

Nx is a set of extensible dev tools for monorepos. Monorepos provide a lot of advantages:

- Everything at that current commit works together. Changes can be verified across all affected parts of the organization.
- Easy to split code into composable modules
- Easier dependency management
- One toolchain setup
- Code editors and IDEs are "workspace" aware
- Consistent developer experience
- ...

But they come with their own technical challenges. The more code you add into your repository, the slower the CI gets.

## Example Workspace

This repo is an example Nx Workspace. It has two applications. Each app has 15 libraries, each of which consists of 30 components. The two applications also share code.

If you run `nx dep-graph`, you will see something like this:

<p align="center"><img src="https://raw.githubusercontent.com/nrwl/nx-azure-build/master/readme-assets/graph.png" width="800"></p>

### CI Provider

This example will use Github Actions, but you'll find similar setup for [Azure Pipelines](https://github.com/nrwl/nx-azure-build), [Jenkins](https://github.com/nrwl/nx-jenkins-build) or [Gitlab CI](https://github.com/yannickglt/nx-gitlab-build).

### **To see CI runs click [here](https://github.com/yannickglt/nx-github-build/actions).**

## Baseline

Most projects that don't use Nx end up building, testing, and linting every single library and application in the repository. The easiest way to implement it with Nx is to do something like this:

```yaml
ci:
  image: node:12.16.3-alpine3.11
  before_script:
    - yarn install
  script:
    - yarn nx run-many --target=test --all
    - yarn nx run-many --target=lint --all
    - yarn nx run-many --target=build --all --prod
```

This will retest, relint, rebuild every project. Doing this for this repository takes about 45 minutes (note that most enterprise monorepos are significantly larger, so in those cases we are talking about many hours.)

The easiest way to make your CI faster is to do less work, and Nx is great at that.

## Building Only What is Affected

Nx knows what is affected by your PR, so it doesn't have to test/build/lint everything. Say the PR only touches `ng-lib9`. If you run `nx affected:dep-graph`, you will see something like this:

<p align="center"><img src="https://raw.githubusercontent.com/nrwl/nx-azure-build/master/readme-assets/graph-one-affected.png" width="800"></p>

If you update `.github/workflows/nx-distributed-tasks.yml` to use `nx affected` instead of `nx run-many`:

```yaml
name: Nx Distributed Tasks
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - run: git fetch --no-tags --prune --depth=1 origin master
      - run: yarn install
      - run: yarn nx affected --target=test --base=origin/master
      - run: yarn nx affected --target=lint --base=origin/master
      - run: yarn nx affected --target=build --base=origin/master --prod
```

the CI time will go down from 45 minutes to 8 minutes.

This is a good result. It helps to lower the average CI time, but doesn't help with the worst case scenario. Some PR are going to affect a large portion of the repo.

<p align="center"><img src="https://raw.githubusercontent.com/nrwl/nx-azure-build/master/readme-assets/graph-everything-affected.png" width="800"></p>

You could make it faster by running the commands in parallel:

```yaml
name: Nx Distributed Tasks
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - run: git fetch --no-tags --prune --depth=1 origin master
      - run: yarn install
      - run: yarn nx affected --target=test --base=origin/master --parallel
      - run: yarn nx affected --target=lint --base=origin/master --parallel
      - run: yarn nx affected --target=build --base=origin/master --prod --parallel
```

This helps but it still has a ceiling. At some point, this won't be enough. A single agent is simply insufficent. You need to distribute CI across a grid of machines.

## Distributed CI

To distribute you need to split your job into multiple jobs.

```

                          / lint1
Prepare Distributed Tasks - lint2
                          - lint3
                          - test1
                          ....
                          \ build3

```

### Distributed Setup

The following job get benefits of [Github actions matrix strategy](https://docs.github.com/en/free-pro-team@latest/actions/learn-github-actions/managing-complex-workflows#using-a-build-matrix) to run jobs in parallel.

```yaml
distributed-task:
  runs-on: ubuntu-latest
  needs: install-deps
  strategy:
    matrix:
      target: ['lint', 'test', 'build', 'e2e']
      index: [1, 2, 3, 4, 5, 6]
  steps:
    - run: node ./tools/scripts/run-many.js ${{ matrix.target }} ${{ matrix.index }} 6 $GITHUB_REF
```

Where `run-many.js` looks like this:

```javascript
const execSync = require('child_process').execSync;

const target = process.argv[2];
const jobIndex = Number(process.argv[3]);
const jobCount = Number(process.argv[4]);
const isMaster = process.argv[5] === 'refs/head/master';
const baseSha = isMaster ? 'origin/master~1' : 'origin/master';

const affected = execSync(
  `npx nx print-affected --base=${baseSha} --target=${target}`
).toString('utf-8');
const array = JSON.parse(affected).tasks.map((t) => t.target.project);
array.sort();
const sliceSize = Math.floor(array.length / jobCount);
const projects =
  jobIndex < jobCount
    ? array.slice(sliceSize * (jobIndex - 1), sliceSize * jobIndex)
    : array.slice(sliceSize * (jobIndex - 1));

if (projects.length > 0) {
  execSync(
    `npx nx run-many --target=${target} --projects=${projects.join(
      ','
    )} --parallel}`,
    {
      stdio: [0, 1, 2],
    }
  );
}
```

Let's step through it:

The following defines the base sha Nx uses to execute affected commands.

```javascript
const isMaster = process.argv[5] === 'refs/heads/master';
const baseSha = isMaster ? 'origin/master~1' : 'origin/master';
```

If it is a PR, Nx sees what has changed compared to `origin/master`. If it's master, Nx sees what has changed compared to the previous commit (this can be made more robust by remembering the last successful master run, which can be done by labeling the commit).

The following calculates the projects to execute given the `${{ matrix.index }}` job index variable and the harcoded job count (`6` in our example).

```javascript
const sliceSize = Math.floor(array.length / jobCount);
const projects =
  jobIndex < jobCount
    ? array.slice(sliceSize * (jobIndex - 1), sliceSize * jobIndex)
    : array.slice(sliceSize * (jobIndex - 1));
```

The following prints information about affected project that have the needed target. `print-affected` doesn't run any targets, just prints information about them.

```javascript
execSync(`npx nx print-affected --base=${baseSha} --target=${target}`)
  .toString()
  .trim();
```

Feel free to adapt the indexes in the matrix to increase the jobs to run parallely to keep CI time under 15 minutes regardless how big the repo is.

## Summary

1. Rebuilding/retesting/relinting everyting on every code change doesn't scale. **In this example it takes 45 minutes.**
2. Nx lets you rebuild only what is affected, which drastically improves the average CI time, but it doesn't address the worst-case scenario.
3. Nx helps you run multiple targets in parallel on the same machine.
4. Nx provides `print-affected` and `run-many` which make implemented distributed CI simple. **In this example the time went down from 45 minutes to only 7**
