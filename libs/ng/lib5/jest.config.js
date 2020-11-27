module.exports = {
  name: 'ng-lib5',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/libs/ng/lib5',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
