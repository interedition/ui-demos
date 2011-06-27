import urllib
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

# TODO We currently assume that the only TEI display option is via the
# Versioning Machine.  This should change in future.

class VMachineRender( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Another post-only page</title></head><body>You should not be navigating here via GET.</body></html>' )
    
    XSLTransformService = 'http://glowing-samurai-588.heroku.com/vmtransform'
    
    def post( self ):
        '''Need a single parameter, which is the TEI parallel-seg file that was
        the output of the collation run.'''
        
        # Send the TEI to the transformer, get the HTML response back, return it
        # as the answer.
        payload = urllib.urlencode( self.request.get( 'result' ) )
        urlresult = urlfetch.fetch( url=self.XSLTransformService,
                                    payload=payload,
                                    method='POST' )
        if urlresult.status_code == 200:
            html_response = urlresult.content
        else:
            raise ServiceNotOKError( 'Service %s returned status code %d' 
                                     % ( service, urlresult.status_code ) )
        self.response.headers.__setitem__( 'content-type', 'text/html' )
        self.response.out.write( html_response )

class NoServiceError( Exception ): pass
class ServiceNotOKError( Exception ): pass

application = webapp.WSGIApplication(
                                      [('/teidisplay', VMachineRender),],
                                      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
