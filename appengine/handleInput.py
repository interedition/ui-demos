import xml
import re
from xml.dom import minidom

TEI_NS = 'http://www.tei-c.org/ns/1.0'
ELEMENT_NODE = xml.dom.Node.ELEMENT_NODE
TEXT_NODE = xml.dom.Node.TEXT_NODE

def filetype( xmlstr ):
    '''Takes an XML string and looks at its contents to make a guess as to how it should be tokenized.'''
    type = 'unknown'
    try:
        xmlfile = minidom.parseString( xmlstr )
        # So it is an XML file; is it TEI?
        if( xmlfile.documentElement.getAttribute( 'xmlns' ) == TEI_NS ):
            type = 'teixml'
        # Add here any other types of file we learn how to parse.
        else:
            type = 'otherxml'
        xmlfile.unlink()
    except xml.parsers.expat.ExpatError, inst:
        # Assume it should be tokenized as plain text.
        if( re.match( 'syntax error: line \d+, column 0', inst.args[0] ) ):
            type = 'plaintext'
        else:
            raise
    return( type )

def get_tei_document_node( xmlstr ):
    '''Takes a file or a filehandle and returns a list of the elements
    therein that are named TEI.  This makes a good starting point for
    find_text_children.'''
    teifile = minidom.parseString( xmlstr.encode( "utf-8" ))
    if( teifile.documentElement.tagName.lower() == 'teicorpus' or
        teifile.documentElement.tagName.lower() == 'tei' ):
        return teifile.documentElement
    else:
        raise NoTEIDocumentElement( 'Document element is ' 
                                    + teifile.documentElement.tagName )

def get_text( xmlstr, textaddr ):
    '''Takes an XML string and an address for a particular <text/> node
    within the XML.  Returns the text node as a string. TODO minimize
    calls to find_text_children.'''
    teifile = minidom.parseString( xmlstr.encode( "utf-8" ))
    children = find_text_children( teifile.documentElement )
    address = textaddr.split( '-' )
    currtext = None
    for bit in address:
        currtext = children[int( bit )]
        children = currtext.subtexts
    # At this point currtext should hold the text we are after.
    return currtext.xmlobj.toxml()


def find_text_children( teiElement ):
    '''Returns the set of available texts in a TEI-encoded file.'''
    alltextnodes = []
    ## The passed teiElement could either be a teiCorpus with TEI children
    ## or a single TEI.  We need to operate on TEI nodes.
    teinodes = []
    # Lowercasing these tags is a HORRIBLE HACK and should die SOON
    if( teiElement.tagName == 'teicorpus' ):
        teinodes = teiElement.getElementsByTagName( 'tei' )
    else:
        teinodes = [ teiElement ]
    for teinode in teinodes:
        ## Should return a tuple of textElement, preview, children
        topchildren = teinode.childNodes
        for c in topchildren:
            # Recurse to find text descendants.
            if( c.nodeType == ELEMENT_NODE and c.localName == 'text' ):
                grandchildren = []
                preview = ''
                frontmatter = c.getElementsByTagName( 'front' )
                if( len( frontmatter ) ):
                    preview = string_from_wordlist( get_textnode_words( frontmatter[0] ), 100 )
                    preview += ' // '
                body = c.getElementsByTagName( 'body' )
                if( len( body ) ):
                    preview += string_from_wordlist( get_textnode_words( body[0] ), 100 )
                for cg in c.childNodes:
                    if( cg.nodeType == ELEMENT_NODE and cg.localName == 'group' ):
                        grandchildren.extend( find_text_children( cg ) )
                textObj = teiText( c, preview, grandchildren )
                alltextnodes.append( textObj )
    return alltextnodes

def get_textnode_words( element ):
    '''A utility function to make up for lack of XPath.  Join together all the
    text-node descendants into a single list of words.'''
    out_words = []
    for child in element.childNodes:
        if( child.nodeType == TEXT_NODE ):
            content = child.data.strip()
            out_words.extend( content.split() )
        elif( child.hasChildNodes ):
            out_words.extend( get_textnode_words( child ) )
    return out_words

def string_from_wordlist( wl, length ):
    '''An even dumber utility function.  Return a concatenated string of words
    up to the maximum specified in length.'''
    out_str = wl[0]; del wl[0]
    for word in wl:
        if( len( out_str ) < length ):
            out_str += ' ' + word
        else:
            break
    return out_str

class teiText:
    def __init__( self, xmlobj, preview, children = None ):
        self.xmlobj = xmlobj
        self.preview = preview
        self.subtexts = []
        if( children is not None ):
            self.add_subtexts( children )
    def add_subtexts( self, children ):
        for c in children:
            if c.__class__.__name__ is not 'teiText':
                raise WrongObjectError
            self.subtexts.append( c )
    def dict_export ( self ):
        '''Will only export the XML text string and the subtexts.'''
        data_struct = { 'content' : self.xmlobj.toxml(),
                        'type': 'teixml' }
        if( len( self.subtexts ) > 0 ):
            data_struct[ 'subtexts' ] = []
            for st in self.subtexts:
                data_struct[ 'subtexts' ].append( st.dict_export() )
        return data_struct
    

class WrongObjectError( Exception ): pass
class NoTEIDocumentElement( Exception ): pass
