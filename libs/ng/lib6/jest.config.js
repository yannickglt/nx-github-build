module.exports = {
  name: 'ng-lib6',
  preset: '../../../jest.config.js',
  coverageDirectory: '../../../coverage/libs/ng/lib6',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
