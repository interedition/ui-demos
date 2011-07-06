import logging
import re
import urllib
import xml
from fileupload import FileText
from google.appengine.ext import db
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from xml.dom import minidom
from xml.dom.minidom import getDOMImplementation

# TODO We currently assume that the only TEI display option is via the
# Versioning Machine.  This should change in future.

TEI_NS = 'http://www.tei-c.org/ns/1.0'
TITLE = "Collated text"
PUB_STATEMENT = "Created by Interedition Tools (http://interedition-tools.appspot.com/)"

def add_witnesses( xmlstr, wits ):
    '''Takes a CollateX apparatus string and a witness hash of sigil to
    FileText info, and returns well-formed TEI that includes the
    witness descriptions.'''
    ## First, replace the collatex-apparatus tag with a p tag, because
    ## that is what we will insert into this document.  This is a 
    ## horrible hack made necessary by the limitations of minidom.
    xmlstr = xmlstr.replace( 'collatex:apparatus', 'p' )
    xmlstr = xmlstr.replace( 'xmlns="http://www.tei-c.org/ns/1.0"', '' )
    xmlstr = xmlstr.replace( 'xmlns:collatex="http://interedition.eu/collatex/ns/1.0"', '' )
    apparatus = minidom.parseString( xmlstr )
    
    ## Create the new TEI document
    impl = minidom.getDOMImplementation()
    teidoc = impl.createDocument( TEI_NS, 'TEI', None )
    # would have thought minidom would do this, but evidently not.
    teidoc.documentElement.setAttribute( 'xmlns', TEI_NS )
    # xslpi = teidoc.createProcessingInstruction( 'xml-stylesheet', 'href="/v-machine/src/vmachine.xsl type="text/xsl"' )
    # teidoc.insertBefore( xslpi, teidoc.documentElement )
    teiHeader = teidoc.createElementNS( TEI_NS, 'teiHeader' )
    fileDesc = teidoc.createElementNS( TEI_NS, 'fileDesc' )
    teidoc.documentElement.appendChild( teiHeader ).appendChild( fileDesc )
    
    ## Create the title and publication statements
    title_text = teidoc.createTextNode( TITLE )
    pub_text = teidoc.createTextNode( PUB_STATEMENT )
    titleStmt = teidoc.createElementNS( TEI_NS, 'titleStmt' )
    title = teidoc.createElementNS( TEI_NS, 'title' )
    publicationStmt = teidoc.createElementNS( TEI_NS, 'publicationStmt' )
    p = teidoc.createElementNS( TEI_NS, 'p' )
    fileDesc.appendChild( titleStmt ).appendChild( title ).appendChild( title_text )
    fileDesc.appendChild( publicationStmt ).appendChild( p ).appendChild( pub_text )
    
    ## Now create the witness list.
    sourceDesc = teidoc.createElementNS( TEI_NS, 'sourceDesc' )
    listWit = teidoc.createElementNS( TEI_NS, 'listWit' )
    fileDesc.appendChild( sourceDesc ).appendChild( listWit )
    for sigil in wits:
        textinfo = wits[sigil]
        wit_text = teidoc.createTextNode( textinfo.file )
        wit_el = teidoc.createElementNS( TEI_NS, 'witness' );
        wit_el.setAttribute( 'xml:id', sigil )
        listWit.appendChild( wit_el ).appendChild( wit_text )
    
    ## Now add the collation apparatus as the body of the text.
    text = teidoc.createElementNS( TEI_NS, 'text' )
    body = teidoc.createElementNS( TEI_NS, 'body' )
    teidoc.documentElement.appendChild( text ).appendChild( body ).appendChild( apparatus.documentElement )
    
    return teidoc.toxml( "utf-8" )


class VMachineRender( webapp.RequestHandler ):
    XSLTransformService = 'http://glowing-samurai-588.heroku.com/vmtransform'
    
    def post( self ):
        '''Need a single parameter, which is the TEI parallel-seg file that was
        the output of the collation run.'''
        
        cxoutput = urllib.unquote( self.request.get( 'result' ) )
        # Send the TEI to the transformer, get the HTML response back, return it
        # as the answer.
        urlresult = urlfetch.fetch( url=self.XSLTransformService,
                                    deadline=10,
                                    payload=cxoutput.encode( 'utf-8' ),
                                    method='POST' )
        if urlresult.status_code != 200:
            raise ServiceNotOKError( 'Service %s returned status code %d: %s' 
                                     % ( self.XSLTransformService, urlresult.status_code, urlresult.content ) )
        self.response.headers.__setitem__( 'content-type', 'text/html' )
        self.response.out.write( urlresult.content )


class ServiceNotOKError( Exception ): pass

application = webapp.WSGIApplication(
                                      [('/teidisplay', VMachineRender),],
                                      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
