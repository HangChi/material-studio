package com.materialstudio.asset;
import com.materialstudio.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class AssetLibraryTest extends ApiTestSupport {
 @Test void paginatesOnlyOwnAssetsWithStableCursorAndPrivateUrls() throws Exception {
  String owner=session(),stranger=session();Set<String> ids=new HashSet<>();for(int i=0;i<3;i++)ids.add(asset(owner));String foreign=asset(stranger);
  var first=call("/api/assets?limit=2",HttpMethod.GET,owner,null);assertThat(first.getStatusCode().value()).isEqualTo(200);var payload=first.getBody();assertThat(payload.path("items").size()).isEqualTo(2);
  String cursor=payload.path("nextCursor").asText();var second=call("/api/assets?limit=2&cursor="+cursor,HttpMethod.GET,owner,null).getBody();assertThat(second.path("items").size()).isEqualTo(1);assertThat(second.path("nextCursor").isNull()).isTrue();
  Set<String> found=new HashSet<>();for(var item:payload.path("items")){found.add(item.path("id").asText());assertThat(item.toString()).doesNotContain("storageFilename","ownerId");}for(var item:second.path("items"))found.add(item.path("id").asText());assertThat(found).isEqualTo(ids);
  assertThat(call("/api/assets?cursor="+foreign,HttpMethod.GET,owner,null).getStatusCode().value()).isEqualTo(400);assertThat(call("/api/assets?limit=51",HttpMethod.GET,owner,null).getStatusCode().value()).isEqualTo(400);assertThat(call("/api/assets",HttpMethod.GET,null,null).getStatusCode().value()).isEqualTo(401);
 }
}
