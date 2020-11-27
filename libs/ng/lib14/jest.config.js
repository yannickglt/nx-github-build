module.exports = {
  name: 'ng-lib14',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/libs/ng/lib14',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
