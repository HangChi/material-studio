package com.materialstudio.identity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import java.util.*;
@RestController
@RequestMapping("/api/account")
public class AccountController {
 public record Registration(String username,String password){}
 public record Login(String username,String password,boolean mergeGuest){}
 public record Rotation(String password){}
 public record Recovery(String username,String recoveryCode,String password){}
 private final AccountService accounts;private final boolean secure;
 public AccountController(AccountService accounts,@Value("${studio.cookie-secure:false}")boolean secure){this.accounts=accounts;this.secure=secure;}
 @PostMapping("/register") public ResponseEntity<?> register(@CookieValue(name="material_session",required=false)String token,@RequestBody Registration input){return response(accounts.register(token,input.username(),input.password()),201);}
 @PostMapping("/login") public ResponseEntity<?> login(@CookieValue(name="material_session",required=false)String token,@RequestBody Login input){return response(accounts.login(token,input.username(),input.password(),input.mergeGuest()),200);}
 @PostMapping("/recover") public ResponseEntity<?> recover(@CookieValue(name="material_session",required=false)String token,@RequestBody Recovery input){return response(accounts.recover(token,input.username(),input.recoveryCode(),input.password()),200);}
 @PostMapping("/recovery-code") public ResponseEntity<?> rotate(@CookieValue(name="material_session",required=false)String token,@RequestBody Rotation input){return response(accounts.rotate(token,input.password()),200);}
 private ResponseEntity<?> response(AccountService.Result result,int status){var body=new LinkedHashMap<String,Object>();body.put("user",Map.of("id",result.user().id(),"username",result.username(),"createdAt",result.user().createdAt()));if(result.recoveryCode()!=null)body.put("recoveryCode",result.recoveryCode());return ResponseEntity.status(status).header("Cache-Control","no-store").header(HttpHeaders.SET_COOKIE,ResponseCookie.from("material_session",result.token()).httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(30L*86400).build().toString()).body(body);}
}
