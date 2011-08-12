import logging
import simplejson as json
import urllib
from google.appengine.ext import blobstore
from google.appengine.ext import db

#### Datastore classes
class FileInfo( db.Model ):
    blobkey = db.StringProperty()  # file ID: key
    user = db.UserProperty()       # who uploaded the thing
    type = db.StringProperty()     # plaintxt, teixml, collatexinput, etc. // TODO do we use this?

class FileText( db.Model ):
    blobkey = db.StringProperty()  # file ID
    id = db.StringProperty()       # unique text ID
    offset = db.IntegerProperty()  # where in the file I start
    length = db.IntegerProperty()  # how long I am
    sigil = db.StringProperty()    # the eventual sigil for this text
    file = db.StringProperty()     # the name of the parent file
    filetype = db.StringProperty() # the type of the parent file

class TextTokens( db.Model ):
    blobkey = db.StringProperty()  # file ID
    id = db.StringProperty()       # unique text ID
    tokens = db.TextProperty()     # JSON-encoded tokens

def load_text_from_id( textid_str, sigil=None ):
    '''Given a text ID, save the user-specified sigil and return its
    content and its type.  We combine these to minimize DB queries.'''
    textid_str = str( urllib.unquote( textid_str ) )
    text_record = _get_first_record( textid_str, 'FileText' )
    if sigil and text_record.sigil != sigil:
        text_record.sigil = sigil
        text_record.put()
    logging.info( "About to read %s at offset %s for length %s, text %s"
                  %( text_record.file, text_record.offset, text_record.length, text_record.id ) )
    reader = blobstore.BlobReader( blobstore.BlobKey( text_record.blobkey ) )
    if text_record.filetype == 'collatexinput':
        start = text_record.offset
        end = text_record.offset + text_record.length
        xmlfile = xml_regularize( reader.read() )
        content = xmlfile[start:end]
    else: 
        content = reader.read()
    answer = { 'entity': text_record,
               'content': content,
               'type': text_record.filetype }
    return answer

def save_user_sigil( textid_str, sigil ):
    '''Given a text ID, save the user-specified sigil and return its
    content and its type.'''
    textid_str = str( urllib.unquote( textid_str ) )
    text_record = _get_first_record( textid_str, 'FileText' )
    if sigil and text_record.sigil != sigil:
        text_record.sigil = sigil
        text_record.put()
    logging.info( "Sigil for %s is now %s" % ( textid_str, sigil ) )
    return text_record


def load_tokens_from_id( textid_str ):
    '''Given an ID, return the saved JSON tokens.'''
    textid_str = str( urllib.unquote( textid_str ) )
    text_tokens = _get_first_record( textid_str, 'TextTokens' )
    logging.info( "About to return tokens for text %s" % textid_str )
    tokens = json.loads( text_tokens.tokens )
    return tokens

def strip_tags( tstr ):
    cxtextmatch = re.match( r"\<witness[^\>]*\>(.*)\</witness\>", tstr )
    if cxtextmatch:
        return cxtextmatch.group(1)
    else:
        return tstr

def _get_first_record( textid_str, table ):
    '''Given a text ID and a table, return the record from the given table
    for the given text.'''
    id_parts = textid_str.split( '-' )
    text_id = id_parts.pop()
    blob_id = '-'.join( id_parts )
    q = db.GqlQuery( "SELECT * FROM %s WHERE blobkey = '%s' AND id = '%s'" 
                                     % ( table, blob_id, text_id ) )
    text_record = q.get()
    if text_record == None:
        logging.error( "No record found for text ID %s in table %s" % ( textid_str, table ) )
        raise TextNotFoundError
    return text_record

class TextNotFoundError( Exception ): pass

__all__ = [ 'FileInfo', 'FileText', 'TextTokens', 'load_text_from_id', 'save_user_sigil', 'load_tokens_from_id', 'strip_tags', 'TextNotFoundError' ]
