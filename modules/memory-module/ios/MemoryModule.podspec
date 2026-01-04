Pod::Spec.new do |s|
  s.name           = 'MemoryModule'
  s.version        = '1.0.0'
  s.summary        = 'Native memory monitoring for React Native'
  s.description    = 'Provides accurate memory usage information using native APIs'
  s.author         = 'Secret Library'
  s.homepage       = 'https://github.com/audiobookshelf/audiobookshelf-app'
  s.platforms      = { :ios => '16.0' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
  s.swift_version = '5.4'
end
