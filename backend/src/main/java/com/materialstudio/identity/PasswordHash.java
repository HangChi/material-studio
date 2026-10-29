package com.materialstudio.identity;
import java.security.*;
import java.util.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
final class PasswordHash {
 private static final SecureRandom RANDOM=new SecureRandom();
 record Derived(String salt,String hash){}
 static Derived derive(String password){byte[] salt=new byte[16];RANDOM.nextBytes(salt);String encoded=Base64.getEncoder().encodeToString(salt);return new Derived(encoded,hash(password,encoded));}
 static String hash(String password,String salt){var spec=new PBEKeySpec(password.toCharArray(),Base64.getDecoder().decode(salt),600000,256);try{return HexFormat.of().formatHex(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded());}catch(GeneralSecurityException e){throw new IllegalStateException(e);}finally{spec.clearPassword();}}
 static String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 static boolean equal(String a,String b){return MessageDigest.isEqual(a.getBytes(java.nio.charset.StandardCharsets.US_ASCII),b.getBytes(java.nio.charset.StandardCharsets.US_ASCII));}
}
