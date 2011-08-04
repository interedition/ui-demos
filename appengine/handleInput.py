import logging
import re
import xml
from xml.dom import minidom

TEI_NS = 'http://www.tei-c.org/ns/1.0'
ELEMENT_NODE = xml.dom.Node.ELEMENT_NODE
TEXT_NODE = xml.dom.Node.TEXT_NODE

def parse_file( content ):
    '''Takes a string that is the contents of a file, and determines the
    individual texts within it.  ID is of the form X-Y-Z, dependent on
    number of levels of subtexts.'''
    type = filetype( content )
    ## Either it parsed, or it wasn't an XML doc at all.
    textlist = []
    if( type == 'plaintext' ):
        textlist.append( { 'offset': 0,
                           'length': len( content ),
                           'type': type,
                           'id': '0',
                           } )
    elif( type == 'teixml' ):
        content = xml_regularize( content )
        # Do not split apart texts at this point
        # textlist = find_tei_texts( content )
        textlist.append( { 'offset': 0,
                           'length': len( content ),
                           'type': type,
                           'id': '0',
                           } )
    elif( type == 'collatexinput' ):
        content = xml_regularize( content )
        textlist = find_collatex_witnesses( content )
    else:
        logging.error( 'Do not support file type %s' % type )
        raise UnsupportedFiletypeException
    return textlist
    

def filetype( xmlstr ):
    '''Takes an XML string and looks at its contents to make a guess as to
    how it should be tokenized.'''
    type = 'unknown'
    xmlstr = xmlstr.lstrip()
    if xmlstr.startswith( '<?xml' ):
        # This might raise a parsing error; we catch it upstream.
        xmlfile = minidom.parseString( xmlstr )
        # So it is an XML file; is it TEI?
        if( xmlfile.documentElement.getAttribute( 'xmlns' ) == TEI_NS 
            or xmlfile.documentElement.tagName == 'TEI.2' ):
            type = 'teixml'
        # Add here any other types of file we learn how to parse.
        elif( xmlfile.documentElement.nodeName == 'examples' ):
            # it is a CollateX lightweight witness file
            type = 'collatexinput'
        else:
            type = 'otherxml'
        xmlfile.unlink()
    else:
        type = 'plaintext'
    return( type )

def xml_regularize( xmlstr ):
    '''Parses the XML and returns its string representation.  Need this to
    be able to reliably find element offsets.'''
    xmldoc = minidom.parseString( xmlstr )
    return xmldoc.toxml( 'utf-8' )

def find_tei_texts( teistr ):
    '''Returns the set of available texts in a TEI-encoded file.'''
    teiElement = get_tei_document_node( teistr )
    ## The passed teiElement could either be a teiCorpus with TEI children
    ## or a single TEI.  We need to operate on TEI nodes.
    teinodes = []
    logging.info( "Got doc element with name %s" % teiElement.nodeName )
    if( teiElement.nodeName == 'teiCorpus' ):
        teinodes = teiElement.getElementsByTagName( 'TEI' )
    else:
        teinodes = [ teiElement ]
    
    textlist = []
    for teinode in teinodes:
        ## Should return a dict of offset, length, id.
        logging.info( 'Looking at TEI node %s' % teinode.nodeName )
        sequence = len( textlist )
        topchildren = teinode.childNodes
        for c in topchildren:
            logging.info( 'Looking at child node %s' % c.nodeName )
            if( c.nodeType == ELEMENT_NODE and c.localName == 'text' ):
                childinfo = {}
                childstr = c.toxml( 'utf-8' )
                childid = str( sequence )
                childinfo['offset'] = teistr.find( childstr )
                childinfo['length'] = len( childstr )
                childinfo['type'] = 'teixml'
                childinfo['id'] = childid
                textlist.append( childinfo )
    return textlist

def get_tei_document_node( xmlstr ):
    '''Takes a file or a filehandle and returns a list of the elements
    therein that are named TEI.  This makes a good starting point for
    find_tei_texts.'''
    teifile = minidom.parseString( xmlstr )
    if( teifile.documentElement.tagName.lower() == 'teicorpus' or
        teifile.documentElement.tagName.lower() == 'tei.2' or
        teifile.documentElement.tagName.lower() == 'tei' ):
        return teifile.documentElement
    else:
        raise NoTEIDocumentElement( 'Document element is ' 
                                    + teifile.documentElement.tagName )

def find_collatex_witnesses( xmlstr ):
    doc = minidom.parseString( xmlstr )
    examples = doc.documentElement.getElementsByTagName( 'example' )
    sequence = 0
    textlist = []
    for ex in examples:
        witnesses = ex.getElementsByTagName( 'witness' )
        for wit in witnesses:
            witstr = wit.toxml( 'utf-8' )
            wit_id = wit.getAttribute( 'id' )
            if sequence:
                wit_id = wit_id + '-' + str( sequence )
            wit_info = { 'id': wit_id,
                         'offset': xmlstr.find( witstr ),
                         'length': len( witstr ),
                         'type': 'collatexinput' }
            textlist.append( wit_info )
        sequence += 1
    return textlist


class WrongObjectError( Exception ): pass
class NoTEIDocumentElement( Exception ): pass
class UnsupportedFiletypeException( Exception ): pass
