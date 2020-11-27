module.exports = {
  name: 'ng-lib11',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/libs/ng/lib11',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
