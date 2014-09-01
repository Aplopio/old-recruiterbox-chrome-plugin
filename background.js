(function($) {
    this._RB = this._RB || {};

    _RB.utils = {
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

    _RB.RboxManager = {
        _meta: {
            BASE_URI: 'http://demoaccount.rbox.com:8000',
            BASE_API_URI: 'http://demoaccount.rbox.com:8000/api/v1'
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

        exportAsCandidate: function( data, callback ) {
            // var self = this;
            // self.getCredentials( function( credentials ) {
            //     var params = $.extend( {}, credentials, { format: 'json' } );
            //     var url_for_candidate_create = _RB.utils.getURL(
            //         self._meta.BASE_API_URI + 'candidates/', params );

            //     var candidate_data = {
            //         first_name: data.profile_name
            //     };
                
            //     _RB.utils.postJSON( url_for_candidate_create, candidate_data )
            //         .done( function( resp ) {
            //             $( '.notification-candidate-create' ).html(
            //                 'Candidate exported successfully'
            //             );
            //         });
            // });
        }       
    };
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if( request.action === 'rbox-get-credentials' ) {
                _RB.RboxManager.getCredentials(function( data ) {
                    sendResponse( data );
                });
            } else if( request.action === 'rbox-export-as-candidates' ) {
                _RB.RboxManager.exportAsCandidate(
                    request.data, function( data ) {
                        sendResponse( data );
                    });
            }
        }
    );
})( jQuery );