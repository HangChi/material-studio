package com.materialstudio.identity;
import com.materialstudio.common.ApiException;
import com.materialstudio.job.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.*;
@Service
public class AccountService {
 public record Result(DemoUser user,String username,String recoveryCode,String token){}
 private record Authentication(AccountMapper.Account account,boolean blocked){}
 private final AccountMapper mapper;private final UserMapper users;private final SessionService sessions;private final CreationMapper creation;private final AdmissionMapper admission;private final TransactionTemplate tx;
 public AccountService(AccountMapper mapper,UserMapper users,SessionService sessions,CreationMapper creation,AdmissionMapper admission,PlatformTransactionManager manager){this.mapper=mapper;this.users=users;this.sessions=sessions;this.creation=creation;this.admission=admission;tx=new TransactionTemplate(manager);tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);}
 private String username(String value){String name=value==null?"":value.strip().toLowerCase(Locale.ROOT);if(!name.matches("[a-z0-9_]{3,32}"))throw new ApiException(422,"VALIDATION_FAILED","用户名需3～32位字母、数字或下划线");return name;}
 private void password(String value){if(value==null||value.length()<8||value.length()>128)throw new ApiException(422,"VALIDATION_FAILED","请输入有效密码");}
 private void newPassword(String value){if(value==null||value.length()<8||value.length()>18)throw new ApiException(422,"VALIDATION_FAILED","密码需8～18个字符");}
 private ApiException failed(){return new ApiException(401,"AUTH_FAILED","用户名或验证信息不正确");}
 private Result attach(AccountMapper.Account account,String oldToken,String recovery){String token=sessions.newToken();sessions.revoke(oldToken);return new Result(sessions.attach(token,account.userId(),30),account.username(),recovery,token);}
 public Result register(String token,String inputName,String password){
  var visitor=sessions.require(token);String name=username(inputName);newPassword(password);var derived=PasswordHash.derive(password);String code=sessions.newToken();
  try{return tx.execute(status->{
   if(creation.lockOwner(visitor.id())==null)throw failed();if(mapper.byUser(visitor.id())!=null)throw new ApiException(409,"ACCOUNT_EXISTS","当前身份已绑定账号，请先退出");
   var account=new AccountMapper.Account(visitor.id(),name,derived.hash(),derived.salt(),PasswordHash.digest(code),Instant.now());mapper.insert(account);return attach(account,token,code);
  });}catch(org.springframework.dao.DuplicateKeyException duplicate){throw new ApiException(409,"USERNAME_TAKEN","该用户名已被使用，请更换");}
 }
 private AccountMapper.Account authenticate(String name,String credential,boolean recovery){
  var result=tx.execute(status->{
   mapper.ensureAttempt(name);var attempt=mapper.attempt(name);boolean expired=attempt.windowStarted().plusSeconds(900).isBefore(Instant.now());if(expired)mapper.clearAttempts(name);else if(attempt.failures()>=5)return new Authentication(null,true);
   var account=mapper.byName(name);boolean valid;
   if(recovery)valid=PasswordHash.equal(PasswordHash.digest(credential),account==null?"0".repeat(64):account.recoveryHash());
   else valid=PasswordHash.equal(PasswordHash.hash(credential,account==null?Base64.getEncoder().encodeToString(new byte[16]):account.salt()),account==null?"0".repeat(64):account.passwordHash());
   if(account==null||!valid){mapper.failed(name);return new Authentication(null,false);}mapper.clearAttempts(name);return new Authentication(account,false);
  });
  if(result.blocked())throw new ApiException(429,"AUTH_THROTTLED","验证失败次数过多，请15分钟后重试");if(result.account()==null)throw failed();return result.account();
 }
 public Result login(String token,String inputName,String password,boolean merge){
  String name=username(inputName);password(password);var checked=authenticate(name,password,false);var source=sessions.current(token);
  return tx.execute(status->{
   var locks=new TreeSet<String>();locks.add(checked.userId());if(source!=null)locks.add(source.id());for(String id:locks)if(creation.lockOwner(id)==null)throw failed();
   var target=mapper.lock(checked.userId());if(target==null||!PasswordHash.equal(target.passwordHash(),checked.passwordHash()))throw failed();
   if(source!=null&&!source.id().equals(target.userId())){
    if(mapper.byUser(source.id())!=null)throw new ApiException(409,"ACCOUNT_SWITCH_REQUIRES_LOGOUT","请先退出当前账号，再登录其他账号");
    if(merge){admission.lock();if(mapper.pending(source.id())>0)throw new ApiException(409,"MIGRATION_BUSY","当前访客仍有未完成任务，请完成或取消后再迁移");if(mapper.receiptConflicts(source.id(),target.userId())>0||mapper.batchConflicts(source.id(),target.userId())>0)throw new ApiException(409,"MIGRATION_CONFLICT","访客与账号存在相同提交标识，未迁移任何数据；可取消迁移后登录");
     mapper.moveAssets(source.id(),target.userId());mapper.moveJobs(source.id(),target.userId());mapper.moveBatches(source.id(),target.userId());mapper.moveReceipts(source.id(),target.userId());users.revokeAll(source.id());users.disable(source.id());
    }
   }
   return attach(target,token,null);
  });
 }
 public Result rotate(String token,String password){
  var current=sessions.require(token);var account=mapper.byUser(current.id());if(account==null)throw new ApiException(409,"ACCOUNT_REQUIRED","请先绑定或登录账号");password(password);var checked=authenticate(account.username(),password,false);String code=sessions.newToken();
  return tx.execute(status->{if(creation.lockOwner(current.id())==null)throw failed();var latest=mapper.lock(current.id());if(latest==null||!PasswordHash.equal(latest.passwordHash(),checked.passwordHash()))throw failed();var updated=new AccountMapper.Account(latest.userId(),latest.username(),latest.passwordHash(),latest.salt(),PasswordHash.digest(code),latest.createdAt());mapper.reset(updated);return attach(updated,token,code);});
 }
 public Result recover(String token,String inputName,String code,String password){
  String name=username(inputName);newPassword(password);if(code==null||code.length()>128)throw new ApiException(422,"VALIDATION_FAILED","请提供有效恢复码");var checked=authenticate(name,code,true);var derived=PasswordHash.derive(password);String nextCode=sessions.newToken();
  return tx.execute(status->{
   if(creation.lockOwner(checked.userId())==null)throw failed();var account=mapper.lock(checked.userId());if(account==null||!PasswordHash.equal(account.recoveryHash(),checked.recoveryHash()))throw failed();
   var next=new AccountMapper.Account(account.userId(),account.username(),derived.hash(),derived.salt(),PasswordHash.digest(nextCode),account.createdAt());mapper.reset(next);users.revokeAll(account.userId());return attach(next,token,nextCode);
  });
 }
}
