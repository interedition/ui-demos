import re
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class IndexPage( webapp.RequestHandler ):
    def get( self ):
        user = users.get_current_user()
        if user:
            main_page = open( 'html/collate01.html' )
            self.response.out.write( main_page.read() )
        else:
            self.redirect(users.create_login_url(self.request.uri))

class FileUploadHandler( webapp.RequestHandler ):
    def post( self ):
        contents = None
        if( self.request.get( 'inputfile' ) ):
            contents = self.request.get( 'inputfile' )
        if( contents ):
            self.response.out.write( contents )

application = webapp.WSGIApplication(
                                     [('/', IndexPage),
                                      ('/uploadfile', FileUploadHandler)],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
