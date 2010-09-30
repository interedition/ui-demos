import re
# import simplejson as json
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class IndexPage( webapp.RequestHandler ):
    def get( self ):
        main_page = open( 'html/collate01.html' )
        self.response.out.write( main_page.read() )

class FileUploadHandler( webapp.RequestHandler ):
    def post( self ):
        contents = None
        if( self.request.get( 'inputfile' ) ):
            contents = self.request.get( 'inputfile' )
        if( contents ):
            # self.response.headers.add_header( 'Content-Type', 'application/xml; charset=utf-8' )
            self.response.out.write( contents )
            # self.response.out.write( '<fileContent>%s</fileContent>' % contents )

application = webapp.WSGIApplication(
                                     [('/', IndexPage),
                                      ('/uploadfile', FileUploadHandler)],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
