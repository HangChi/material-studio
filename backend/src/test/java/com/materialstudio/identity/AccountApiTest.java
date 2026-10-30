package com.materialstudio.identity;
import com.materialstudio.ApiTestSupport;
import com.materialstudio.job.JobDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
class AccountApiTest extends ApiTestSupport {
 @MockitoBean JobDispatcher dispatcher;
 static final String PASSWORD="Test-password26!";
 String username(){return "user_"+UUID.randomUUID().toString().replace("-","").substring(0,15);}
 String cookie(ResponseEntity<?> response){return response.getHeaders().getFirst("Set-Cookie").split(";",2)[0];}
 ResponseEntity<com.fasterxml.jackson.databind.JsonNode> register(String owner,String name){return call("/api/account/register",HttpMethod.POST,owner,Map.of("username",name,"password",PASSWORD));}
 ResponseEntity<com.fasterxml.jackson.databind.JsonNode> login(String owner,String name,String password,boolean merge){return call("/api/account/login",HttpMethod.POST,owner,Map.of("username",name,"password",password,"mergeGuest",merge));}
 String task(String owner,String asset,String key){HttpHeaders h=new HttpHeaders();h.set("Cookie",owner);h.setContentType(MediaType.APPLICATION_JSON);h.set("Idempotency-Key",key);var r=http.exchange("/api/jobs",HttpMethod.POST,new HttpEntity<>(Map.of("templateId","demo-portrait","assetIds",List.of(asset)),h),com.fasterxml.jackson.databind.JsonNode.class);assertThat(r.getStatusCode().value()).isEqualTo(202);return r.getBody().path("job").path("id").asText();}
 void finish(String id){jdbc.update("UPDATE job SET status='FAILED',error_code='TEST_SEED',error_message='终态',finished_at=CURRENT_TIMESTAMP(6) WHERE id=?",id);}
 @Test void bindsExistingVisitorAndSupportsIndependentDeviceSessions()throws Exception{
  String guest=session(),asset=asset(guest),name=username(),owner=call("/api/session",HttpMethod.GET,guest,null).getBody().path("user").path("id").asText();var registered=register(guest,name);
  assertThat(registered.getStatusCode().value()).isEqualTo(201);assertThat(registered.getBody().path("user").path("id").asText()).isEqualTo(owner);assertThat(registered.getBody().path("recoveryCode").asText()).hasSize(43);assertThat(registered.getBody().toString()).doesNotContain("password","hash","salt");
  String first=cookie(registered);assertThat(call("/api/session",HttpMethod.GET,guest,null).getStatusCode().value()).isEqualTo(401);var second=login(null,name.toUpperCase(Locale.ROOT),PASSWORD,false);assertThat(second.getStatusCode().value()).isEqualTo(200);String other=cookie(second);
  assertThat(call("/api/assets",HttpMethod.GET,other,null).getBody().path("items").get(0).path("id").asText()).isEqualTo(asset);
  call("/api/session",HttpMethod.DELETE,first,null);assertThat(call("/api/session",HttpMethod.GET,first,null).getStatusCode().value()).isEqualTo(401);assertThat(call("/api/session",HttpMethod.GET,other,null).getBody().path("user").path("username").asText()).isEqualTo(name);
  assertThat(jdbc.queryForObject("SELECT password_hash FROM local_account WHERE user_id=?",String.class,owner)).isNotEqualTo(PASSWORD);
 }
 @Test void recoveryRotatesCodePasswordAndRevokesEveryOldSession(){
  String name=username();var registered=register(session(),name);assertThat(registered.getStatusCode().value()).isEqualTo(201);String a=cookie(registered),b=cookie(login(null,name,PASSWORD,false)),code=registered.getBody().path("recoveryCode").asText(),nextPassword="Next-password26!";
  var recovered=call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",code,"password",nextPassword));assertThat(recovered.getStatusCode().value()).isEqualTo(200);assertThat(recovered.getBody().path("recoveryCode").asText()).isNotEqualTo(code);
  for(String old:List.of(a,b))assertThat(call("/api/session",HttpMethod.GET,old,null).getStatusCode().value()).isEqualTo(401);
  assertThat(login(null,name,PASSWORD,false).getStatusCode().value()).isEqualTo(401);assertThat(login(null,name,nextPassword,false).getStatusCode().value()).isEqualTo(200);
  assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",code,"password",PASSWORD)).getStatusCode().value()).isEqualTo(401);
 }
 @Test void mergesOnlyExplicitFinishedGuestResources()throws Exception{
  String name=username();var registered=register(session(),name);assertThat(registered.getStatusCode().value()).isEqualTo(201);String target=registered.getBody().path("user").path("id").asText();
  String source=session(),asset=asset(source),id=task(source,asset,"source-key");finish(id);
  var merged=login(source,name,PASSWORD,true);assertThat(merged.getStatusCode().value()).isEqualTo(200);String next=cookie(merged);
  assertThat(call("/api/jobs/"+id,HttpMethod.GET,next,null).getStatusCode().value()).isEqualTo(200);assertThat(jdbc.queryForObject("SELECT owner_id FROM asset WHERE id=?",String.class,asset)).isEqualTo(target);assertThat(call("/api/session",HttpMethod.GET,source,null).getStatusCode().value()).isEqualTo(401);
 }
 @Test void rejectsActiveGuestConflictsAndMergingTwoAccounts()throws Exception{
  String name=username();var account=register(session(),name);assertThat(account.getStatusCode().value()).isEqualTo(201);String target=cookie(account),targetJob=task(target,asset(target),"collision");finish(targetJob);
  String source=session(),sourceJob=task(source,asset(source),"collision");
  var busy=login(source,name,PASSWORD,true);assertThat(busy.getStatusCode().value()).isEqualTo(409);assertThat(busy.getBody().path("error").path("code").asText()).isEqualTo("MIGRATION_BUSY");finish(sourceJob);
  var conflict=login(source,name,PASSWORD,true);assertThat(conflict.getStatusCode().value()).isEqualTo(409);assertThat(call("/api/session",HttpMethod.GET,source,null).getStatusCode().value()).isEqualTo(200);
  var another=register(session(),username());assertThat(login(cookie(another),name,PASSWORD,true).getStatusCode().value()).isEqualTo(409);
 }
 @Test void replacesLostRecoveryCodeAfterReauthentication(){
  String name=username();var registered=register(session(),name);assertThat(registered.getStatusCode().value()).isEqualTo(201);String current=cookie(registered),old=registered.getBody().path("recoveryCode").asText();
  var rotated=call("/api/account/recovery-code",HttpMethod.POST,current,Map.of("password",PASSWORD));assertThat(rotated.getStatusCode().value()).isEqualTo(200);String code=rotated.getBody().path("recoveryCode").asText();assertThat(code).hasSize(43).isNotEqualTo(old);
  assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",old,"password",PASSWORD)).getStatusCode().value()).isEqualTo(401);
  assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",code,"password",PASSWORD)).getStatusCode().value()).isEqualTo(200);
 }
 @Test void throttlesRepeatedFailedAuthenticationWithoutLockingForever(){
  String name=username();assertThat(register(session(),name).getStatusCode().value()).isEqualTo(201);
  for(int n=0;n<5;n++)assertThat(login(null,name,"Wrong-only-test-password!",false).getStatusCode().value()).isEqualTo(401);
  var blocked=login(null,name,PASSWORD,false);assertThat(blocked.getStatusCode().value()).isEqualTo(429);assertThat(blocked.getHeaders().getFirst("Retry-After")).isEqualTo("900");
  jdbc.update("UPDATE auth_attempt SET window_started=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 16 MINUTE) WHERE username=?",name);assertThat(login(null,name,PASSWORD,false).getStatusCode().value()).isEqualTo(200);
 }
 @Test void acceptsBothNewPasswordBoundariesAcrossRegistrationRecoveryAndLogin(){
  for(int length:List.of(8,18)){
   String name=username(),password="p".repeat(length);
   var registered=call("/api/account/register",HttpMethod.POST,session(),Map.of("username",name,"password",password));
   assertThat(registered.getStatusCode().value()).isEqualTo(201);
   assertThat(login(null,name,password,false).getStatusCode().value()).isEqualTo(200);
   var rotated=call("/api/account/recovery-code",HttpMethod.POST,cookie(registered),Map.of("password",password));
   assertThat(rotated.getStatusCode().value()).isEqualTo(200);
   String code=rotated.getBody().path("recoveryCode").asText();
   String next="n".repeat(length);
   assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",code,"password",next)).getStatusCode().value()).isEqualTo(200);
   assertThat(login(null,name,next,false).getStatusCode().value()).isEqualTo(200);
  }
 }
 @Test void rejectsOutOfRangeNewPasswordsWithoutChangingAccountOrConsumingRecovery(){
  for(int length:List.of(7,19)){
   String name=username();var rejected=call("/api/account/register",HttpMethod.POST,session(),Map.of("username",name,"password","p".repeat(length)));
   assertThat(rejected.getStatusCode().value()).isEqualTo(422);
   assertThat(rejected.getBody().path("error").path("message").asText()).isEqualTo("密码需8～18个字符");
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM local_account WHERE username=?",Long.class,name)).isZero();
  }
  String name=username();var registered=register(session(),name);String code=registered.getBody().path("recoveryCode").asText(),current=cookie(registered);
  for(int length:List.of(7,19))assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",code,"password","n".repeat(length))).getStatusCode().value()).isEqualTo(422);
  assertThat(call("/api/session",HttpMethod.GET,current,null).getStatusCode().value()).isEqualTo(200);
  assertThat(login(null,name,PASSWORD,false).getStatusCode().value()).isEqualTo(200);
  assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",code,"password","newpass8")).getStatusCode().value()).isEqualTo(200);
 }
 @Test void keepsLegacyLongPasswordsUsableUntilRecoverySetsANewPassword(){
  String name=username(),legacy="Old-password-over-18-characters";var registered=register(session(),name);
  String owner=registered.getBody().path("user").path("id").asText();var hash=PasswordHash.derive(legacy);
  jdbc.update("UPDATE local_account SET password_hash=?,salt=? WHERE user_id=?",hash.hash(),hash.salt(),owner);
  var signedIn=login(null,name,legacy,false);assertThat(signedIn.getStatusCode().value()).isEqualTo(200);
  var rotated=call("/api/account/recovery-code",HttpMethod.POST,cookie(signedIn),Map.of("password",legacy));assertThat(rotated.getStatusCode().value()).isEqualTo(200);
  assertThat(call("/api/account/recover",HttpMethod.POST,null,Map.of("username",name,"recoveryCode",rotated.getBody().path("recoveryCode").asText(),"password","newpass8")).getStatusCode().value()).isEqualTo(200);
  assertThat(login(null,name,legacy,false).getStatusCode().value()).isEqualTo(401);
  assertThat(login(null,name,"newpass8",false).getStatusCode().value()).isEqualTo(200);
 }
}
