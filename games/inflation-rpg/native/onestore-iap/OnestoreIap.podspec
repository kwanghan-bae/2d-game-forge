require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'OnestoreIap'
  s.version = package['version']
  s.summary = 'Local 원스토어 IAP plugin (Android only — iOS stub).'
  s.license = 'MIT'
  s.homepage = 'https://github.com/kwanghan-bae/2d-game-forge'
  s.author = 'kwanghan-bae'
  s.source = { :git => 'local', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
