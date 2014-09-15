(function( $ ) {
    this._RBB = this._RBB || {};

    _RBB.utils = {
        getURL: function( base_url, params ) {
            return base_url + '?' + $.param(params);
        },

        postJSON: function( url, data, callback, errCallback ) {
            if( errCallback === undefined ) {
                errCallback = function() {
                    console.error('Something broke');
                    return;
                };
            }
            return $.ajax({
                url: url,
                data:JSON.stringify(data),
                type:'POST',
                contentType:'application/json',
                dataType: 'json',
                success: callback,
                error: function(XMLHttpRequest, textStatus, errorThrow) {
                    errCallback( XMLHttpRequest );
                }
            });
        },

        slugify: function( text ) {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
        }
    };

    _RBB.RboxManager = {
        _meta: {
            BASE_URI: 'https://app.recruiterbox.com',
            BASE_API_URI: 'https://app.recruiterbox.com/api/v1'
            // BASE_URI: 'http://demoaccount.rbox.com:8000',
            // BASE_API_URI: 'http://demoaccount.rbox.com:8000/api/v1'
        },

        getURLWithCredentials: function( url, credentials ) {
            var params = $.extend(
                {}, {
                    username: credentials.username,
                    api_key: credentials.api_key
                }, { format: 'json' }
            );
            var url_with_credentials = _RBB.utils.getURL(
                url, params );
            return url_with_credentials;
        },

        getCredentials: function( callback ) {
            var self = this;
            $.get(self._meta.BASE_URI + '/accounts/get_credentials_for_plugin_user',
                function( data ) {
                    callback( data );
                }
            ).error( function( data ) {
                callback( data );
            });
        },

        createRboxDocResource: function( html, options, callback, errCallback ) {
            options = options || {};
            var self = this;
            var filename = options.filename || 'profile.html';
            var url_with_credentials = self.getURLWithCredentials(
                self._meta.BASE_API_URI + '/docs/', options.credentials
            );
            _RBB.utils.postJSON( url_with_credentials, {
                filename: filename,
                filecontent: html
            }, callback, errCallback );
        },

        createRboxCandidateResource: function( data, options, callback, errCallback ) {
            options = options || {};
            var self = this;
            var url_with_credentials = self.getURLWithCredentials(
                self._meta.BASE_API_URI + '/candidates/', options.credentials
            );
            _RBB.utils.postJSON( url_with_credentials,
                data, callback, errCallback );
        },

        exportAsCandidate: function( data, options, callback, errCallback ) {
            options = options || {};
            var self = this;
            var html = data.background_html;
            var profile_name = data.profile_name || 'no name';
            if( html ) {
                self.getCredentials( function( credentials ) {
                    self.createRboxDocResource(
                        html, {
                            filename: _RBB.utils.slugify( profile_name ) + '.html',
                            credentials: credentials
                        },
                        function( doc ) {
                            var candidate_data = {
                                first_name: profile_name,
                                last_name: '',
                                resume: doc.resource_uri,
                                candidate_source: data.source_data.source
                            };
                            self.createRboxCandidateResource( candidate_data, {
                                credentials: credentials
                            }, callback, errCallback);
                        },
                        errCallback
                    );
                });   
            }
        }       
    };
    
})( jQuery );

chrome.runtime.onConnect.addListener( function( port ) {
    if( port.name == "RB_PORT" ) {
        port.onMessage.addListener( function( context ) {
            if( context.request === 'rbox_get_credentials' ) {
                _RBB.RboxManager.getCredentials( function( data ) {
                    context.data = data;
                    port.postMessage( context );
                });
            } else if( context.request === 'rbox_export_as_candidate' ) {
                _RBB.RboxManager.exportAsCandidate(
                    context.profile_to_export, {},
                    function( data ){
                        context.data = data;
                        port.postMessage( context );
                    },
                    function() {
                        context.error = 'Something went wrong';
                            port.postMessage( context );
                    }
                );
            }
        });
    }
});