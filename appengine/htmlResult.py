from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

# Simple library to render the HTML that resulted from the call to CollateX.

class HTMLRender( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Another post-only page</title></head><body>You should not be navigating here via GET.</body></html>' )
    
    def post( self ):
        '''Need a single parameter, which is the HTML file that was the output
        of the collation run.'''
        ## Which button did we have?
        type = 'text/html'
        if self.request.get( 'Render as SVG' ):
            type = 'image/svg+xml'
        self.response.headers.__setitem__( 'content-type', type )
        self.response.out.write( self.request.get('result') )

class NoServiceError( Exception ): pass
class ServiceNotOKError( Exception ): pass

application = webapp.WSGIApplication(
                                      [('/display', HTMLRender),],
                                      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
