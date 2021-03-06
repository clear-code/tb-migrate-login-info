PACKAGE_NAME = migrate-login-info

.PHONY: all xpi signed clean

all: xpi

xpi: makexpi/makexpi.sh copy-extlib
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o -v

copy-extlib:
	git submodule update
	#cp extlib/**/*.jsm modules/lib/
	cp extlib/**/*.js modules/lib/
	rm modules/**/*.test.js

makexpi/makexpi.sh:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

clean:
	rm $(PACKAGE_NAME).xpi $(PACKAGE_NAME)_noupdate.xpi sha1hash.txt
