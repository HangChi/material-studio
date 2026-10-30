#!/bin/sh
# Run inside backend-test with the repository mounted at /project.
set -eu
mvn -B -o -DskipTests package
mkdir -p target/sample-runtime target/demo-tools
(cd target/sample-runtime && jar xf ../material-studio-0.1.0.jar BOOT-INF/lib)
demo_cp='target/classes:target/sample-runtime/BOOT-INF/lib/*'
javac -cp "$demo_cp" -d target/demo-tools /project/scripts/PrepareSamples.java
java -Djava.awt.headless=true -Xmx512m -cp "target/demo-tools:$demo_cp" PrepareSamples /project
