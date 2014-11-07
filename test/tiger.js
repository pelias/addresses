/**
 * @file Unit-tests for the 'tiger' addresses module.
 */

'use strict';

var stream = require( 'stream' );
var util = require( 'util' );
var through = require( 'through' );

var Address = require( '../lib/address' );
var tiger = require( '../lib/addresses/tiger' );

module.exports.tests = {};

module.exports.tests.filter = function ( test, common ){
  test( 'filter(): Filters addresses.', function ( t ){
    // Check whether manually inserted records are being filtered
    // correctly.
    var rawRecords = new stream.Readable( { objectMode: true } );
    var assertFilter = through( function write( obj ){
      t.true(
        obj.geometry.type === 'LineString', 'Records are LineStrings'
      );

      function notNull( propName ){
        return obj.properties[ propName ] !== null;
      }

      t.true(
        ( notNull( 'LFROMADD' ) && notNull( 'LTOADD' ) ) ||
        ( notNull( 'RFROMADD' ) && notNull( 'RTOADD' ) ),
        'Valid street range is present.'
      );
    }, function end(){
      t.end();
    });

    var testRecords = [
      {
        geometry: {
          type: 'Not a LineString'
        },
        properties: {
          LFROMADD: null,
          LTOADD: null,
          RFROMADD: 5,
          RTOADD: 10
        }
      },
      {
        geometry: {
          type: 'LineString'
        },
        properties: {
          LFROMADD: null,
          LTOADD: null,
          RFROMADD: null,
          RTOADD: 10
        }
      },
      {
        geometry: {
          type: 'LineString'
        },
        properties: {
          LFROMADD: null,
          LTOADD: null,
          RFROMADD: 5,
          RTOADD: 10,
          FULLNAME: 'street'
        }
      }
    ];
    for( var rec = 0; rec < testRecords.length; rec++ ){
      rawRecords.push( testRecords[ rec ] );
    }
    rawRecords.push( null );
    rawRecords.pipe( tiger.filter ).pipe( assertFilter );
  });
};

module.exports.tests.normalizer = function ( test, common ){
  test( 'normalizer(): Interpolates and normalizes addresses.',
    // Check whether manually inserted records are getting interpolated and
    // normalized correctly.
    function ( t ){
      var rawRecords = new stream.Readable( { objectMode: true } );
      rawRecords.push({
        geometry: {
          coordinates: [ [ 0, 10 ], [ 4, 6 ], [ 7, 9 ], [ 3, 12 ] ]
        },
        properties: {
          LFROMADD: 19,
          LTOADD: 21,
          RFROMADD: 20,
          RTOADD: 22,
          FULLNAME: 'street',
          ZIPL: null,
          ZIPR: 10001
        }
      });
      rawRecords.push( null );

      var expected = [
        new Address(
          null, 19, 'street', null, null, 10001, "United States",
          10.000106066017178, 0.00010606601717798211
        ),
        new Address(
          null, 21, 'street', null, null, 10001, "United States", 11.99988,
          2.99991
        ),
        new Address(
          null, 20, 'street', null, null, 10001, "United States",
          9.999893933982822, -0.00010606601717798211
        ),
        new Address(
          null, 22, 'street', null, null, 10001, "United States", 12.00012,
          3.00009
        )
      ];
      var currCompareRecord = 0;
      var assertFilter = through( function ( obj ){
        t.deepEqual(
          obj, expected[ currCompareRecord++ ],
          util.format( 'Record #%d matches.', currCompareRecord )
        );
      }, function end(){
        t.end();
      });
      rawRecords.pipe( tiger.normalizer ).pipe( assertFilter );
    }
  );
};
