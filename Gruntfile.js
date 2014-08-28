module.exports = function(grunt) {
    // Configuration goes here
    grunt.initConfig({
        jst: {
            compile: {
                options: {
                    // prettify: true,
                    templateSettings: {
                        variable: 'rbp'
                    },
                    processName: function( full_filename ) {
                        var filename = full_filename.match(/\/[^\/]*$/g)[0].substr(1);
                        return 'jst-' + filename.replace(/\.html$/, '');
                    },
                    namespace: '_RBP.JST'
                },
                files: {
                    "template.js": ["jst/*.html"]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jst');
    grunt.registerTask('default', ['jst']);
};