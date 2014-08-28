(function($) {
    this._RBP = this._RBP || {};

    _.templateFromId = function( id, data ){
        var template = _RBP.JST[ id ];
        return data ? template( data ) : template;
    };

    _RBP.utils = {
        getURL: function( base_url, params ) {
            return base_url + '?' + $.param(params);
        },

        postJSON: function( url, data ) {
            return $.ajax({
                url: url,
                data:JSON.stringify(data),
                type:'POST',
                contentType:'application/json'
            });
        }
    };

    _RBP.RboxManager = {
        _meta: {
            BASE_URI: '',
            BASE_API_URI: ''
        },

        getCredentials: function( callback ) {
            var self = this;
            $.get(self._meta.BASE_URI + 'accounts/get_credentials_for_plugin_user',
                function(data) {
                    callback(data);
                }
            ).error(function(data) {
                debugger;
            });
        },

        exportAsCandidate: function( data, callback ) {
            var self = this;
            self.getCredentials( function( credentials ) {
                var params = $.extend( {}, credentials, { format: 'json' } );
                var url_for_candidate_create = _RBP.utils.getURL(
                    self._meta.BASE_API_URI + 'candidates/', params );

                var candidate_data = {
                    first_name: responseData.profile_name
                };
                
                _RBP.utils.postJSON( url_for_candidate_create, candidate_data )
                    .done( function( resp ) {
                        $( '.notification-candidate-create' ).html(
                            'Candidate exported successfully'
                        );
                    });
            });
        }       
    };

    _RBP.LinkedIn = {
        injectStyling: function() {
            $( 'head' ).append(
                _.templateFromId(
                    'jst-plugin-styling', {}
                )
            );
        },

        initScaffold: function() {
            $( '#wrapper' ).before(
                _.templateFromId(
                    'jst-plugin-body', {}
                )
            );
            $( '.rbox-plugin-body' ).html(
                _.templateFromId(
                    'jst-plugin-export-block', {}
                )
            );
        },

        extractProfile: function() {
            var isDesiredContainer = function( container_id ) {
                var desired_background_fields = [
                    "background-experience-container",
                    "background-projects-container",
                    "background-education-container"
                ];
                return desired_background_fields.indexOf( container_id ) !== -1;
            };
            var content = {};
            content.profile_name = $( 'h1' ).find( '.full-name' ).text();
            var profile_html = '';
            $( '.background-content' ).children().each(
                function( index, container ) {
                    var $container = $( container );
                    if( isDesiredContainer( $container.attr( 'id' ) ) ) {
                        $container.find( 'script' ).remove();
                        profile_html = profile_html + $container.html();
                    }
                }
            );
            content.background_html = profile_html;
            return content;
        },

        events: function() {
            var self = this;
            $(document).ready(function() {
                self.injectStyling();
                self.initScaffold();
            });
        }
    };

    
    _RBP.router = function() {
        var href = document.location.href
        if (href.match(/^https:\/\/www.linkedin.com\/.*/g)) {
            _RBP.LinkedIn.events();
        }
    };

    _RBP.events = function() {
        $(document).ready(function() {
            _RBP.router();
        });
    };

    _RBP.main = function() {
        this.events();
    }

    _RBP.main();
})( jQuery );