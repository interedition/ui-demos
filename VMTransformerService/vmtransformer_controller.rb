require 'rubygems'
require 'sinatra'
require 'haml'
require 'xml/xslt'

#set :environment, :development
#set :show_exceptions, true

class VMTransformerController
 
  get '/doc' do
    haml :doc
  end
  
  post '/vmtransform' do
    xslt = XML::XSLT.new()
    xslt.xml = request.body.read
    xslt.xsl = File.open( 'vmachine.xsl', 'rb' ).read
    xslt.serve()
  end
  
end