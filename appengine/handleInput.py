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
    try:
        type = filetype( content )
    except xml.parsers.expat.ExpatError:
        raise  ## It was an XML document but it failed to parse
    else:
        ## Either it parsed, or it wasn't an XML doc at all.
        textlist = []
        if( type == 'plaintext' ):
            textlist.append( { 'offset': 0,
                               'length': len( content ),
                               'parent': None,
                               'type': type,
                               'id': '0',
                               } )
        elif( type == 'teixml' ):
            textlist = find_tei_texts( content )
        elif( type == 'collatexinput' ):
            textlist = find_collatex_witnesses( content )
        else:
            logging.error( 'Do not support file type %s' % filetype )
            raise UnsupportedFiletypeException
    return textlist
    

def filetype( xmlstr ):
    '''Takes an XML string and looks at its contents to make a guess as to
    how it should be tokenized.'''
    type = 'unknown'
    try:
        xmlfile = minidom.parseString( xmlstr )
        # So it is an XML file; is it TEI?
        if( xmlfile.documentElement.getAttribute( 'xmlns' ) == TEI_NS ):
            type = 'teixml'
        # Add here any other types of file we learn how to parse.
        elif( xmlfile.documentElement.nodeName() == 'example' ):
            # it is a CollateX lightweight witness file
            type = 'collatexinput'
        else:
            type = 'otherxml'
        xmlfile.unlink()
    except xml.parsers.expat.ExpatError, inst:
        if( re.match( 'syntax error: line \d+, column 0', inst.args[0] ) ):
            # Assume it should be tokenized as plain text.
            type = 'plaintext'
        else:
            # It was XML but failed to parse for some other reason.
            raise
    return( type )

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
        sequence = len( textlist )
        topchildren = teinode.childNodes
        for c in topchildren:
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

def find_witnesses( xmlstr ):
    doc = minidom.parsestring( xmlstr )
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
                         'parent': None,   # collatex input doesn't have subtexts
                         'type': 'collatexinput' }
            textlist.append( wit_info )
        sequence += 1
    return textlist


class WrongObjectError( Exception ): pass
class NoTEIDocumentElement( Exception ): pass
class UnsupportedFiletypeException( Exception ): pass
