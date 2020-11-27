module.exports = {
  name: 'ng-lib9',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/libs/ng/lib9',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
