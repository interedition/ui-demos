require 'vmtransformer_controller.rb'
require 'test/unit'
require 'rack/test'

ENV['RACK_ENV'] = 'test'

class VMTransformerControllerTest < Test::Unit::TestCase
  include Rack::Test::Methods

  def app
    Sinatra::Application
  end

  # def test_doc
  #   get '/doc'
  #   assert last_response.ok?
  #   assert last_response.body =~ /accepts:(.*)/
  # end

  def test_simple_post
    xml = File.open( 'test/prophecy_of_merlin.xml', 'rb' ).read
    post '/vmtransform', xml
    assert last_response.ok?
    assert last_response.body.include?( '<title>Prophecy of Merlin -- The Versioning Machine 4.0</title>' )
  end
    
end