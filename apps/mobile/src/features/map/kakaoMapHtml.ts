/**
 * Kakao Maps JS SDK v3 + 클러스터러를 담은 WebView HTML (ADR-003).
 * RN ↔ WebView postMessage 브리지:
 *  - WebView → RN: {type:'ready'} | {type:'region', center, zoom, bbox} | {type:'marker', complex_id}
 *  - RN → WebView: window.__setMarkers(json) | window.__moveTo(lat,lng)
 * Kakao JavaScript Key만 주입(도메인/번들 제한). REST 키는 서버(Edge Function)에만 둔다.
 */
export function buildKakaoMapHtml(appKey: string, initLat: number, initLng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
  <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    function send(obj){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
    function postRegion(map){
      var b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast(), c = map.getCenter();
      send({type:'region', center:{lat:c.getLat(), lng:c.getLng()}, zoom: map.getLevel(),
            bbox:{minLat:sw.getLat(), minLng:sw.getLng(), maxLat:ne.getLat(), maxLng:ne.getLng()}});
    }
    kakao.maps.load(function(){
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${initLat}, ${initLng}), level: 5
      });
      var clusterer = new kakao.maps.MarkerClusterer({ map: map, averageCenter: true, minLevel: 7 });
      var markers = [];

      window.__setMarkers = function(json){
        try {
          var list = JSON.parse(json);
          clusterer.clear(); markers.forEach(function(m){ m.setMap(null); }); markers = [];
          list.forEach(function(it){
            var mk = new kakao.maps.Marker({ position: new kakao.maps.LatLng(it.lat, it.lng), title: it.name });
            kakao.maps.event.addListener(mk, 'click', function(){ send({type:'marker', complex_id: it.complex_id}); });
            markers.push(mk);
          });
          clusterer.addMarkers(markers);
        } catch(e){ send({type:'error', message:String(e)}); }
      };
      window.__moveTo = function(lat,lng){ map.panTo(new kakao.maps.LatLng(lat,lng)); };

      kakao.maps.event.addListener(map, 'idle', function(){ postRegion(map); });
      send({type:'ready'});
      postRegion(map);
    });
  </script>
</body>
</html>`;
}
