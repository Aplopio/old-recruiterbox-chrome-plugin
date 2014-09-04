(function($) {
    this._RBB = this._RBB || {};

    _RBB.utils = {
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

    _RBB.RboxManager = {
        _meta: {
            BASE_URI: 'http://demoaccount.rbox.com:8000',
            BASE_API_URI: 'http://demoaccount.rbox.com:8000/api/v1'
        },

        getCredentials: function( callback ) {
            // callback({
            //     username: "demoaccount@recruiterbox.com",
            //     api_key: "272adf62de6f047f4db9225724bea46b1826a9ae"
            // })
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
            //     var url_for_candidate_create = _RBB.utils.getURL(
            //         self._meta.BASE_API_URI + 'candidates/', params );

            //     var candidate_data = {
            //         first_name: data.profile_name
            //     };
                
            //     _RBB.utils.postJSON( url_for_candidate_create, candidate_data )
            //         .done( function( resp ) {
            //             $( '.notification-candidate-create' ).html(
            //                 'Candidate exported successfully'
            //             );
            //         });
            // });
        }       
    };
    
})( jQuery );

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if( request.action === 'rbox-get-credentials' ) {
            // sendResponse({
            //     username: "demoaccount@recruiterbox.com",
            //     api_key: "272adf62de6f047f4db9225724bea46b1826a9ae"
            // });
            _RBB.RboxManager.getCredentials(function( data ) {
                alert(data.api_key);
                sendResponse( data );
            });
        } else if( request.action === 'rbox-export-as-candidates' ) {
            _RBB.RboxManager.exportAsCandidate(
                request.data, function( data ) {
                    sendResponse( data );
                });
        }
    }
);