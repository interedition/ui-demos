import logging
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class IndexPage( webapp.RequestHandler ):
    def get( self ):
        user = users.get_current_user()
        if user:
            username = user.nickname()
            if username == None:
                username = user.user_id()
            main_page = open( 'html/collate01.html' )
            ## We have to use our own very rudimentary templating methods,
            ## because Django syntax conflicts with jquery template
            ## syntax.
            template = main_page.read().replace( '__USERNAME__', username )
            template = template.replace( '__LOGOUT__', users.create_logout_url('/' ) )
            self.response.out.write( template )
        else:
            self.redirect( users.create_login_url( "/" ) )

application = webapp.WSGIApplication(
                                     [('/', IndexPage)],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
